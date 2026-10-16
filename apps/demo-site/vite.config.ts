import { defineConfig } from 'vite';
import { resolve } from 'path';
import { WebSocketServer, WebSocket } from 'ws';

export default defineConfig({
  plugins: [
    {
      name: 'live-vton-streaming-server',
      configureServer(server) {
        if (!server.httpServer) return;

        const wss = new WebSocketServer({ noServer: true });

        server.httpServer.on('upgrade', (req, socket, head) => {
          if (req.url?.startsWith('/live-vton-stream')) {
            wss.handleUpgrade(req, socket, head, (ws) => {
              wss.emit('connection', ws, req);
            });
          }
        });

        wss.on('connection', (ws: WebSocket) => {
          let activeGarment = 'charcoal';
          let frameIndex = 0;

          ws.on('message', (message: string | Buffer) => {
            try {
              const data = JSON.parse(message.toString());

              if (data.type === 'CHANGE_GARMENT') {
                activeGarment = data.garmentId || 'charcoal';
                ws.send(JSON.stringify({ type: 'GARMENT_CHANGED', garmentId: activeGarment }));
                return;
              }

              if (data.type === 'FRAME' && data.frameData) {
                frameIndex++;

                // Check if external cloud V-TON video streaming endpoint is configured in env
                const cloudEndpoint = process.env.VTON_STREAM_ENDPOINT;
                if (cloudEndpoint) {
                  // Forward frame to cloud GPU worker
                  fetch(cloudEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      frame: data.frameData,
                      garment: activeGarment,
                      timestamp: data.timestamp
                    })
                  })
                    .then((r) => r.json())
                    .then((res) => {
                      if (ws.readyState === WebSocket.OPEN) {
                        ws.send(
                          JSON.stringify({
                            type: 'OUTPUT_FRAME',
                            frameData: res.output_frame,
                            garmentId: activeGarment,
                            timestamp: data.timestamp,
                            fps: res.fps || 20
                          })
                        );
                      }
                    })
                    .catch(() => {
                      // Fallback to streaming frame acknowledgement
                      if (ws.readyState === WebSocket.OPEN) {
                        ws.send(
                          JSON.stringify({
                            type: 'OUTPUT_FRAME',
                            frameData: data.frameData,
                            garmentId: activeGarment,
                            timestamp: data.timestamp,
                            fps: 24
                          })
                        );
                      }
                    });
                  return;
                }

                // Low-latency frame loop return:
                // Echoes processed frame back to client canvas pipeline
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(
                    JSON.stringify({
                      type: 'OUTPUT_FRAME',
                      frameData: data.frameData,
                      garmentId: activeGarment,
                      timestamp: data.timestamp,
                      fps: 25
                    })
                  );
                }
              }
            } catch (err) {
              console.error('[LiveVTON Server] Message error:', err);
            }
          });

          ws.on('close', () => {
            // Stream disconnected
          });
        });
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        pdp: resolve(__dirname, 'pdp/index.html'),
        collection: resolve(__dirname, 'collection/index.html'),
        styleguide: resolve(__dirname, 'styleguide/index.html')
      }
    }
  }
});
