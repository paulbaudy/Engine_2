define([
  'components/compositorComponent',
  'graphicsAPI',
], (
  CompositorComponent,
  GraphicsAPI
) => {
  'use strict';

  let GL = undefined;

  // # Classe *DeformationCompositorComponent*
  // Ce compositeur applique une déformation dynamique sur l'écran.
  class DeformationCompositorComponent extends CompositorComponent {
    // ## Méthode *onEnabled*
    // La méthode *onEnabled* est appelée quand l'objet passe de l'état
    // activé à désactivé.
    onEnabled() {
      this.start = +new Date();
    }

    // ## Méthode *setup*
    // Charge les shaders et les textures nécessaires au composant
    setup(descr) {
      GL = GraphicsAPI.context;

      this.speed = descr.speed;
      this.scale = descr.scale;
      this.start = +new Date();

      return super.setup(descr)
        .then(() => {
          return GraphicsAPI.loadImage(descr.source);
        })
        .then((image) => {
          this.deformation = GL.createTexture();
          GL.bindTexture(GL.TEXTURE_2D, this.deformation);
          GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, image);
          GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
          GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR);
          GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.REPEAT);
          GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.REPEAT);
          GL.bindTexture(GL.TEXTURE_2D, null);

          return GraphicsAPI.loadImage(descr.intensity);
        })
        .then((image) => {
          this.intensity = GL.createTexture();
          GL.bindTexture(GL.TEXTURE_2D, this.intensity);
          GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, image);
          GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
          GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR);
          GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE);
          GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);
          GL.bindTexture(GL.TEXTURE_2D, null);

          this.positionAttrib = GL.getAttribLocation(this.shader, 'aPosition');
          this.uSampler = GL.getUniformLocation(this.shader, 'uSampler');
          this.uDeformation = GL.getUniformLocation(this.shader, 'uDeformation');
          this.uIntensity = GL.getUniformLocation(this.shader, 'uIntensity');
          this.uTime = GL.getUniformLocation(this.shader, 'uTime');
          this.uScale = GL.getUniformLocation(this.shader, 'uScale');

          const verts = [1, 1, -1, 1, -1, -1, -1, -1, 1, -1, 1, 1];
          this.screenQuad = GL.createBuffer();
          GL.bindBuffer(GL.ARRAY_BUFFER, this.screenQuad);
          GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(verts), GL.STATIC_DRAW);
          this.screenQuad.itemSize = 2;
          this.screenQuad.numItems = 6;

          this.rttFrameBuffer = GL.createFramebuffer();
          GL.bindFramebuffer(GL.FRAMEBUFFER, this.rttFrameBuffer);
          this.rttFrameBuffer.width = GraphicsAPI.canvas.width;
          this.rttFrameBuffer.height = GraphicsAPI.canvas.height;

          this.renderTexture = GL.createTexture();
          GL.bindTexture(GL.TEXTURE_2D, this.renderTexture);
          GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, this.rttFrameBuffer.width, this.rttFrameBuffer.height, 0, GL.RGBA, GL.UNSIGNED_BYTE, null);
          GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.NEAREST);
          GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.NEAREST);
          GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE);
          GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);

          this.renderBuffer = GL.createRenderbuffer();
          GL.bindRenderbuffer(GL.RENDERBUFFER, this.renderBuffer);
          GL.renderbufferStorage(GL.RENDERBUFFER, GL.DEPTH_COMPONENT16, this.rttFrameBuffer.width, this.rttFrameBuffer.height);

          GL.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0, GL.TEXTURE_2D, this.renderTexture, 0);
          GL.framebufferRenderbuffer(GL.FRAMEBUFFER, GL.DEPTH_ATTACHMENT, GL.RENDERBUFFER, this.renderBuffer);

          GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

          GL.bindTexture(GL.TEXTURE_2D, null);
          GL.bindRenderbuffer(GL.RENDERBUFFER, null);
          GL.bindFramebuffer(GL.FRAMEBUFFER, null);
        });
    }

    // ## Méthode *compose*
    // Cette méthode est appelée afin d'appliquer un effet sur la caméra
    compose(texture) {
      GL.bindFramebuffer(GL.FRAMEBUFFER, this.rttFrameBuffer);
      GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

      GL.useProgram(this.shader);

      GL.bindBuffer(GL.ARRAY_BUFFER, this.screenQuad);
      GL.enableVertexAttribArray(this.positionAttrib);
      GL.vertexAttribPointer(this.positionAttrib, this.screenQuad.itemSize, GL.FLOAT, false, 0, 0);

      GL.activeTexture(GL.TEXTURE0);
      GL.bindTexture(GL.TEXTURE_2D, texture);
      GL.uniform1i(this.uSampler, 0);

      GL.activeTexture(GL.TEXTURE1);
      GL.bindTexture(GL.TEXTURE_2D, this.deformation);
      GL.uniform1i(this.uDeformation, 1);

      GL.activeTexture(GL.TEXTURE2);
      GL.bindTexture(GL.TEXTURE_2D, this.intensity);
      GL.uniform1i(this.uIntensity, 2);

      const elapsed = ((+new Date()) - this.start) / 1000 * this.speed;
      GL.uniform1f(this.uTime, elapsed);

      GL.uniform1f(this.uScale, this.scale);

      GL.drawArrays(GL.TRIANGLES, 0, this.screenQuad.numItems);
      GL.disableVertexAttribArray(this.positionAttrib);

      if (elapsed >= 1) {
        this.enabled = false;
      }

      return this.renderTexture;
    }
  }

  return DeformationCompositorComponent;
});
