import type { GarmentMeshData } from '@livetry/tryon-core';
import type { TorsoRigState } from '@livetry/tryon-core';

// 1. Mirrored Camera Video Pass
const VIDEO_VS = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
  // Mirror horizontally so front camera acts like a real mirror
  v_texCoord = vec2(1.0 - a_texCoord.x, a_texCoord.y);
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

// 2. Old Clothes Mask & Inpaint Pass
// Replaces real collar / old clothes sticking out around neck with sampled skin
const INPAINT_VS = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
  v_texCoord = a_texCoord;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const INPAINT_FS = `#version 300 es
precision highp float;
uniform sampler2D u_videoTexture;
uniform sampler2D u_segmentTexture; // Multiclass segmentation: 4 = clothes, 2 = body-skin, 3 = face-skin
uniform vec2 u_neckBase;            // Base of neck anchor
uniform vec2 u_chin;                // Chin anchor
uniform float u_torsoLen;
uniform int u_hasSegmentation;

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
  // Sample mirrored video texture
  vec2 videoUV = vec2(1.0 - v_texCoord.x, v_texCoord.y);
  vec4 videoColor = texture(u_videoTexture, videoUV);

  if (u_hasSegmentation == 0) {
    fragColor = videoColor;
    return;
  }

  // Sample category from segmentation mask
  // In selfie_multiclass_256x256: 4 is clothes, 2/3 is skin
  float cat = texture(u_segmentTexture, v_texCoord).r * 255.0;
  bool isClothes = abs(cat - 4.0) < 0.5;

  // Check if pixel is in the neck/collar zone (above shoulders, below chin)
  vec2 p = v_texCoord;
  float distToNeck = length(p - u_neckBase);
  bool isNeckZone = (p.y < (u_neckBase.y + u_torsoLen * 0.15)) && (p.y > (u_chin.y - 0.05)) && (distToNeck < u_torsoLen * 0.35);

  if (isClothes && isNeckZone) {
    // Sample natural skin tone from chin/jawline area
    vec2 skinSampleUV = vec2(1.0 - u_chin.x, u_chin.y);
    vec4 skinTone = texture(u_videoTexture, skinSampleUV);
    // Subtle neck gradient shadow
    float shadow = clamp(0.75 + 0.25 * ((p.y - u_chin.y) / max(u_torsoLen * 0.2, 0.01)), 0.65, 1.0);
    fragColor = vec4(skinTone.rgb * shadow, 1.0);
  } else {
    fragColor = videoColor;
  }
}
`;

// 3. Deformed Garment Mesh Pass (Linear Blend Skinning)
const GARMENT_VS = `#version 300 es
in vec2 a_position;    // (u, v) normalized garment coordinate [0..1]
in vec2 a_texCoord;
in vec4 a_boneWeights; // (torso, leftSleeve, rightSleeve, hem)

uniform vec2 u_shoulderLeft;
uniform vec2 u_shoulderRight;
uniform vec2 u_shoulderMid;
uniform vec2 u_neckBase;
uniform vec2 u_hipMid;
uniform vec2 u_elbowLeft;
uniform vec2 u_elbowRight;
uniform float u_garmentLengthRatio;
uniform float u_yawAngleDeg;

out vec2 v_texCoord;
out float v_yawShading;

void main() {
  v_texCoord = a_texCoord;

  // Geometry vectors
  vec2 shLeft = u_shoulderLeft;
  vec2 shRight = u_shoulderRight;
  vec2 shMid = u_shoulderMid;
  vec2 hipMid = u_hipMid;

  vec2 shSpan = shRight - shLeft;
  float shWidth = length(shSpan);
  vec2 shUnit = shWidth > 0.001 ? normalize(shSpan) : vec2(1.0, 0.0);

  vec2 torsoDir = hipMid - shMid;
  float torsoLen = length(torsoDir);
  vec2 torsoUnit = torsoLen > 0.001 ? normalize(torsoDir) : vec2(0.0, 1.0);

  // Garment dimensions relative to keypoints in sample-tshirt.json:
  // shoulder_left: [0.24, 0.12]
  // shoulder_right: [0.76, 0.12]
  // Span = 0.76 - 0.24 = 0.52
  // Neck top: y = 0.06, Neck center bottom: y = 0.16, Hem: y = 0.95
  float garmentWidth = shWidth / 0.52;
  float garmentLen = torsoLen * u_garmentLengthRatio;

  // 1. Torso Center Baseline
  float uNorm = (a_position.x - 0.50);
  float vNorm = (a_position.y - 0.12) / 0.83; // 0 at shoulder line, 1 at hem

  // Position relative to shoulderMid
  vec2 posTorso = shMid + shUnit * (uNorm * garmentWidth) + torsoUnit * (vNorm * garmentLen);

  // Trapezius / Neck arch: raise collar towards the neck base
  float neckArch = max(0.0, 1.0 - abs(uNorm) * 2.5) * (torsoLen * 0.16);
  posTorso -= torsoUnit * neckArch;

  // 2. Sleeve Arm Tracking
  vec2 leftArmDir = length(u_elbowLeft - shLeft) > 0.01 ? normalize(u_elbowLeft - shLeft) : (torsoUnit * 0.8 - shUnit * 0.6);
  vec2 rightArmDir = length(u_elbowRight - shRight) > 0.01 ? normalize(u_elbowRight - shRight) : (torsoUnit * 0.8 + shUnit * 0.6);

  float leftArmDist = max(0.0, 0.24 - a_position.x) * garmentWidth;
  vec2 posLeftSleeve = shLeft + leftArmDir * (leftArmDist * 1.1) + torsoUnit * (max(0.0, a_position.y - 0.12) * garmentLen * 0.4);

  float rightArmDist = max(0.0, a_position.x - 0.76) * garmentWidth;
  vec2 posRightSleeve = shRight + rightArmDir * (rightArmDist * 1.1) + torsoUnit * (max(0.0, a_position.y - 0.12) * garmentLen * 0.4);

  // 3. Lower Hem Position
  vec2 posHem = hipMid + shUnit * (uNorm * garmentWidth * 0.95) + torsoUnit * ((vNorm - 0.7) * garmentLen);

  // Skinning interpolation
  vec2 worldPos = posTorso;
  if (a_position.x < 0.24) {
    float sleeveWeight = clamp((0.24 - a_position.x) / 0.24, 0.0, 1.0);
    worldPos = mix(posTorso, posLeftSleeve, sleeveWeight);
  } else if (a_position.x > 0.76) {
    float sleeveWeight = clamp((a_position.x - 0.76) / 0.24, 0.0, 1.0);
    worldPos = mix(posTorso, posRightSleeve, sleeveWeight);
  }

  // 4. Horizontal Yaw Perspective Compression
  float rad = radians(u_yawAngleDeg);
  float cosYaw = cos(rad);
  vec2 centerLine = shMid + torsoUnit * (vNorm * garmentLen);
  worldPos = centerLine + (worldPos - centerLine) * vec2(cosYaw, 1.0);

  // Depth shading cue
  v_yawShading = 1.0 - abs(sin(rad)) * 0.25 * (a_position.x - 0.5);

  // Map to clip coordinates [-1..1]
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
  vec3 shaded = color.rgb * clamp(v_yawShading, 0.7, 1.2);
  fragColor = vec4(shaded, color.a * u_opacity);
}
`;

export class WebGLTryonRenderer {
  private gl: WebGL2RenderingContext;
  private inpaintProgram: WebGLProgram | null = null;
  private garmentProgram: WebGLProgram | null = null;
  private videoTexture: WebGLTexture | null = null;
  private segmentTexture: WebGLTexture | null = null;
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
    this.inpaintProgram = this.createProgram(INPAINT_VS, INPAINT_FS);
    this.garmentProgram = this.createProgram(GARMENT_VS, GARMENT_FS);

    const gl = this.gl;
    this.videoTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    this.segmentTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.segmentTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  }

  private initQuad(): void {
    const gl = this.gl;
    this.quadVao = gl.createVertexArray();
    gl.bindVertexArray(this.quadVao);

    const quadData = new Float32Array([
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

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);

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

    const posVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posVbo);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const uvVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvVbo);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.texCoords, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);

    const weightVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, weightVbo);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.boneWeights, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, 0);

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

  public updateSegmentationMask(maskData: Uint8Array | null, width: number, height: number): void {
    if (!maskData || width <= 0 || height <= 0) return;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.segmentTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, width, height, 0, gl.RED, gl.UNSIGNED_BYTE, maskData);
  }

  public render(
    video: HTMLVideoElement,
    rigState: TorsoRigState | null,
    hasSegmentation = false,
    opacity = 1.0
  ): void {
    const gl = this.gl;
    const width = gl.canvas.width;
    const height = gl.canvas.height;
    gl.viewport(0, 0, width, height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 1. Inpaint & Video Pass: Mirror video and conceal existing collar
    if (this.inpaintProgram && this.videoTexture && this.quadVao) {
      gl.useProgram(this.inpaintProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      gl.uniform1i(gl.getUniformLocation(this.inpaintProgram, 'u_videoTexture'), 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.segmentTexture);
      gl.uniform1i(gl.getUniformLocation(this.inpaintProgram, 'u_segmentTexture'), 1);

      gl.uniform1i(gl.getUniformLocation(this.inpaintProgram, 'u_hasSegmentation'), hasSegmentation ? 1 : 0);

      if (rigState) {
        gl.uniform2f(gl.getUniformLocation(this.inpaintProgram, 'u_neckBase'), rigState.neckBase[0], rigState.neckBase[1]);
        gl.uniform2f(gl.getUniformLocation(this.inpaintProgram, 'u_chin'), rigState.chin[0], rigState.chin[1]);
        gl.uniform1f(gl.getUniformLocation(this.inpaintProgram, 'u_torsoLen'), rigState.torsoLength);
      } else {
        gl.uniform2f(gl.getUniformLocation(this.inpaintProgram, 'u_neckBase'), 0.5, 0.3);
        gl.uniform2f(gl.getUniformLocation(this.inpaintProgram, 'u_chin'), 0.5, 0.2);
        gl.uniform1f(gl.getUniformLocation(this.inpaintProgram, 'u_torsoLen'), 0.4);
      }

      gl.bindVertexArray(this.quadVao);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindVertexArray(null);
    }

    // 2. Deformed Garment Pass: Wrap new t-shirt seamlessly
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
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.garmentTexture);
      gl.uniform1i(gl.getUniformLocation(this.garmentProgram, 'u_garmentTexture'), 2);

      gl.uniform2f(gl.getUniformLocation(this.garmentProgram, 'u_shoulderLeft'), rigState.shoulderLeft[0], rigState.shoulderLeft[1]);
      gl.uniform2f(gl.getUniformLocation(this.garmentProgram, 'u_shoulderRight'), rigState.shoulderRight[0], rigState.shoulderRight[1]);
      gl.uniform2f(gl.getUniformLocation(this.garmentProgram, 'u_shoulderMid'), rigState.shoulderMid[0], rigState.shoulderMid[1]);
      gl.uniform2f(gl.getUniformLocation(this.garmentProgram, 'u_neckBase'), rigState.neckBase[0], rigState.neckBase[1]);
      gl.uniform2f(gl.getUniformLocation(this.garmentProgram, 'u_hipMid'), rigState.hipMid[0], rigState.hipMid[1]);
      gl.uniform2f(gl.getUniformLocation(this.garmentProgram, 'u_elbowLeft'), rigState.elbowLeft[0], rigState.elbowLeft[1]);
      gl.uniform2f(gl.getUniformLocation(this.garmentProgram, 'u_elbowRight'), rigState.elbowRight[0], rigState.elbowRight[1]);

      gl.uniform1f(gl.getUniformLocation(this.garmentProgram, 'u_garmentLengthRatio'), this.garmentAspectRatio);
      gl.uniform1f(gl.getUniformLocation(this.garmentProgram, 'u_yawAngleDeg'), rigState.estimatedYawDeg);
      gl.uniform1f(gl.getUniformLocation(this.garmentProgram, 'u_opacity'), opacity);

      gl.bindVertexArray(this.meshVao);
      gl.drawElements(gl.TRIANGLES, this.meshIndexCount, gl.UNSIGNED_SHORT, 0);
      gl.bindVertexArray(null);

      gl.disable(gl.BLEND);
    }
  }

  public dispose(): void {
    const gl = this.gl;
    if (this.videoTexture) gl.deleteTexture(this.videoTexture);
    if (this.segmentTexture) gl.deleteTexture(this.segmentTexture);
    if (this.garmentTexture) gl.deleteTexture(this.garmentTexture);
    if (this.quadVao) gl.deleteVertexArray(this.quadVao);
    if (this.meshVao) gl.deleteVertexArray(this.meshVao);
    if (this.inpaintProgram) gl.deleteProgram(this.inpaintProgram);
    if (this.garmentProgram) gl.deleteProgram(this.garmentProgram);
  }
}
