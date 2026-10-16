import type { GarmentMeshData } from '@livetry/tryon-core';
import type { TorsoRigState } from '@livetry/tryon-core';

const VIDEO_VS = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
  v_texCoord = a_texCoord;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const VIDEO_FS = `#version 300 es
precision highp float;
uniform sampler2D u_videoTexture;
in vec2 v_texCoord;
out vec4 fragColor;

void main() {
  fragColor = texture(u_videoTexture, v_texCoord);
}
`;

const GARMENT_VS = `#version 300 es
in vec2 a_position;    // (u, v) normalized garment coordinate [0..1]
in vec2 a_texCoord;
in vec4 a_boneWeights; // (torso, leftSleeve, rightSleeve, hem)

uniform vec2 u_shoulderLeft;
uniform vec2 u_shoulderRight;
uniform vec2 u_shoulderMid;
uniform vec2 u_hipMid;
uniform float u_garmentLengthRatio;
uniform float u_yawAngleDeg;
uniform vec2 u_resolution;

out vec2 v_texCoord;
out float v_yawShading;

void main() {
  v_texCoord = a_texCoord;

  // Garment key reference geometry in screen space (normalized to [0..1])
  vec2 shLeft = u_shoulderLeft;
  vec2 shRight = u_shoulderRight;
  vec2 shMid = u_shoulderMid;
  vec2 hipMid = u_hipMid;

  vec2 torsoDir = hipMid - shMid;
  float torsoLen = length(torsoDir);
  vec2 torsoUnit = torsoLen > 0.001 ? normalize(torsoDir) : vec2(0.0, 1.0);
  vec2 perpUnit = vec2(-torsoUnit.y, torsoUnit.x);

  // Garment hem position: length is proportional to torsoLength
  float garmentLen = torsoLen * u_garmentLengthRatio;
  vec2 hemAnchor = shMid + torsoUnit * garmentLen;

  // Width vector based on shoulder separation
  vec2 shVec = shLeft - shRight;
  float shWidth = length(shVec);

  // Position candidate 0: Torso central spine
  float uOffset = (a_position.x - 0.5) * shWidth;
  float vOffset = a_position.y * garmentLen;
  vec2 posTorso = shMid + torsoUnit * vOffset + perpUnit * uOffset;

  // Position candidate 1: Left shoulder / sleeve
  vec2 posLeft = shLeft + torsoUnit * vOffset * 0.8 + perpUnit * (a_position.x - 0.75) * shWidth * 0.6;

  // Position candidate 2: Right shoulder / sleeve
  vec2 posRight = shRight + torsoUnit * vOffset * 0.8 + perpUnit * (a_position.x - 0.25) * shWidth * 0.6;

  // Position candidate 3: Lower hem
  vec2 posHem = hemAnchor + perpUnit * uOffset;

  // Linear blend skinning
  vec2 worldPos = posTorso * a_boneWeights.x +
                  posLeft  * a_boneWeights.y +
                  posRight * a_boneWeights.z +
                  posHem   * a_boneWeights.w;

  // Apply horizontal yaw perspective compression
  float rad = radians(u_yawAngleDeg);
  float cosYaw = cos(rad);
  // Compress around torso centerline
  vec2 centerLine = shMid + torsoUnit * (a_position.y * garmentLen);
  worldPos = centerLine + (worldPos - centerLine) * vec2(cosYaw, 1.0);

  // Shading cue for 3D depth when turning
  v_yawShading = 1.0 - abs(sin(rad)) * 0.25 * (a_position.x - 0.5);

  // Map from normalized screen [0, 1] to clip space [-1, 1]
  // Flip Y for standard screen coordinates
  vec2 clipPos = vec2(worldPos.x * 2.0 - 1.0, 1.0 - worldPos.y * 2.0);
  gl_Position = vec4(clipPos, 0.0, 1.0);
}
`;

const GARMENT_FS = `#version 300 es
precision highp float;
uniform sampler2D u_garmentTexture;
uniform float u_opacity;
in vec2 v_texCoord;
in float v_yawShading;
out vec4 fragColor;

void main() {
  vec4 color = texture(u_garmentTexture, v_texCoord);
  if (color.a < 0.05) {
    discard;
  }
  // Apply turning shade & opacity fade
  vec3 shaded = color.rgb * clamp(v_yawShading, 0.6, 1.2);
  fragColor = vec4(shaded, color.a * u_opacity);
}
`;

export class WebGLTryonRenderer {
  private gl: WebGL2RenderingContext;
  private videoProgram: WebGLProgram | null = null;
  private garmentProgram: WebGLProgram | null = null;
  private videoTexture: WebGLTexture | null = null;
  private garmentTexture: WebGLTexture | null = null;
  private quadVao: WebGLVertexArrayObject | null = null;
  private meshVao: WebGLVertexArrayObject | null = null;
  private meshIndexCount = 0;
  private garmentAspectRatio = 1.25;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.initPrograms();
    this.initQuad();
  }

  private createShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compilation error: ${info}`);
    }
    return shader;
  }

  private createProgram(vsSource: string, fsSource: string): WebGLProgram {
    const gl = this.gl;
    const vs = this.createShader(gl.VERTEX_SHADER, vsSource);
    const fs = this.createShader(gl.FRAGMENT_SHADER, fsSource);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(prog);
      gl.deleteProgram(prog);
      throw new Error(`Program link error: ${info}`);
    }
    return prog;
  }

  private initPrograms(): void {
    this.videoProgram = this.createProgram(VIDEO_VS, VIDEO_FS);
    this.garmentProgram = this.createProgram(GARMENT_VS, GARMENT_FS);

    // Setup textures
    const gl = this.gl;
    this.videoTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  private initQuad(): void {
    const gl = this.gl;
    this.quadVao = gl.createVertexArray();
    gl.bindVertexArray(this.quadVao);

    // Fullscreen quad [-1..1]
    const quadData = new Float32Array([
      // pos (x,y), uv (u,v)
      -1, -1, 0, 1,
       1, -1, 1, 1,
      -1,  1, 0, 0,
      -1,  1, 0, 0,
       1, -1, 1, 1,
       1,  1, 1, 0
    ]);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, quadData, gl.STATIC_DRAW);

    // a_position (loc 0)
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);

    // a_texCoord (loc 1)
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

    gl.bindVertexArray(null);
  }

  public setGarmentMesh(mesh: GarmentMeshData, lengthToWidthRatio = 1.25): void {
    const gl = this.gl;
    this.garmentAspectRatio = lengthToWidthRatio;
    this.meshIndexCount = mesh.indices.length;

    this.meshVao = gl.createVertexArray();
    gl.bindVertexArray(this.meshVao);

    // Attribute 0: a_position (u, v)
    const posVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posVbo);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // Attribute 1: a_texCoord (u, v)
    const uvVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvVbo);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.texCoords, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);

    // Attribute 2: a_boneWeights (4 floats)
    const weightVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, weightVbo);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.boneWeights, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, 0);

    // Index buffer
    const ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
  }

  public async loadGarmentTexture(imageUrl: string): Promise<void> {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    await img.decode();

    const gl = this.gl;
    if (!this.garmentTexture) {
      this.garmentTexture = gl.createTexture();
    }
    gl.bindTexture(gl.TEXTURE_2D, this.garmentTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
  }

  public render(
    video: HTMLVideoElement,
    rigState: TorsoRigState | null,
    opacity = 1.0
  ): void {
    const gl = this.gl;
    const width = gl.canvas.width;
    const height = gl.canvas.height;
    gl.viewport(0, 0, width, height);
    gl.clearColor(0.05, 0.05, 0.08, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 1. Draw camera video background
    if (this.videoProgram && this.videoTexture && this.quadVao) {
      gl.useProgram(this.videoProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      gl.uniform1i(gl.getUniformLocation(this.videoProgram, 'u_videoTexture'), 0);

      gl.bindVertexArray(this.quadVao);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindVertexArray(null);
    }

    // 2. Draw deformed garment mesh over torso
    if (
      this.garmentProgram &&
      this.garmentTexture &&
      this.meshVao &&
      rigState &&
      opacity > 0.01
    ) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      gl.useProgram(this.garmentProgram);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.garmentTexture);
      gl.uniform1i(gl.getUniformLocation(this.garmentProgram, 'u_garmentTexture'), 1);

      gl.uniform2f(
        gl.getUniformLocation(this.garmentProgram, 'u_shoulderLeft'),
        rigState.shoulderLeft[0],
        rigState.shoulderLeft[1]
      );
      gl.uniform2f(
        gl.getUniformLocation(this.garmentProgram, 'u_shoulderRight'),
        rigState.shoulderRight[0],
        rigState.shoulderRight[1]
      );
      gl.uniform2f(
        gl.getUniformLocation(this.garmentProgram, 'u_shoulderMid'),
        rigState.shoulderMid[0],
        rigState.shoulderMid[1]
      );
      gl.uniform2f(
        gl.getUniformLocation(this.garmentProgram, 'u_hipMid'),
        rigState.hipMid[0],
        rigState.hipMid[1]
      );
      gl.uniform1f(
        gl.getUniformLocation(this.garmentProgram, 'u_garmentLengthRatio'),
        this.garmentAspectRatio
      );
      gl.uniform1f(
        gl.getUniformLocation(this.garmentProgram, 'u_yawAngleDeg'),
        rigState.estimatedYawDeg
      );
      gl.uniform1f(
        gl.getUniformLocation(this.garmentProgram, 'u_opacity'),
        opacity
      );
      gl.uniform2f(
        gl.getUniformLocation(this.garmentProgram, 'u_resolution'),
        width,
        height
      );

      gl.bindVertexArray(this.meshVao);
      gl.drawElements(gl.TRIANGLES, this.meshIndexCount, gl.UNSIGNED_SHORT, 0);
      gl.bindVertexArray(null);

      gl.disable(gl.BLEND);
    }
  }

  public dispose(): void {
    const gl = this.gl;
    if (this.videoTexture) gl.deleteTexture(this.videoTexture);
    if (this.garmentTexture) gl.deleteTexture(this.garmentTexture);
    if (this.quadVao) gl.deleteVertexArray(this.quadVao);
    if (this.meshVao) gl.deleteVertexArray(this.meshVao);
    if (this.videoProgram) gl.deleteProgram(this.videoProgram);
    if (this.garmentProgram) gl.deleteProgram(this.garmentProgram);
  }
}
