define([
  'components/component',
  'graphicsAPI',
], (
  Component,
  GraphicsAPI
) => {
  'use strict';

  const mat4 = window.mat4;

  let GL = undefined;

  // # Classe *CameraComponent*
  // Cette classe permet de configurer certains paramètres de
  // rendu, la couleur de l'arrière-plan, les dimensions de
  // l'aire d'affichage, etc.
  class CameraComponent extends Component {
    // ## Méthode *create*
    // Cette méthode est appelée pour configurer le composant avant
    // que tous les composants d'un objet aient été créés. On y
    // configure globalement le tests de profondeur, la couleur de
    // l'arrière-plan et la zone de rendu.
    create(descr) {
      GL = GraphicsAPI.context;

      this.clearColor = descr.color;
      this.viewHeight = descr.height;
      this.near = descr.near;
      this.far = descr.far;
      const canvas = this.canvas = GraphicsAPI.canvas;

      GL.enable(GL.DEPTH_TEST);
      GL.depthFunc(GL.LEQUAL);
      GL.clearColor(this.clearColor.r, this.clearColor.g, this.clearColor.b, this.clearColor.a);

      GL.viewport(0, 0, canvas.width, canvas.height);

      this.rttFrameBuffer = GL.createFramebuffer();
      GL.bindFramebuffer(GL.FRAMEBUFFER, this.rttFrameBuffer);
      this.rttFrameBuffer.width = canvas.width;
      this.rttFrameBuffer.height = canvas.height;

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

      return Promise.resolve();
    }

    // ## Méthode *setup*
    // La méthode *setup* récupère les compositeurs spécifiés pour
    // la caméra.
    setup(descr) {
      this.compositors = [];
      descr.compositors.forEach((comp) => {
        const compositor = this.findComponent(comp);
        this.compositors.push(compositor);
      });
      return Promise.resolve();
    }

    // ## Méthode *update*
    // La méthode *update* est appelée une fois par itération de
    // la boucle de jeu. La caméra courante est conservée, et on
    // efface la zone de rendu. La zone de rendu sera à nouveau
    // remplie par les appels aux méthodes *display* des autres
    // composants.
    update() {
      CameraComponent.current = this;
      let rt = this.renderTexture;
      this.compositors.forEach((comp) => {
        if (comp.enabled) {
          rt = comp.compose(rt);
        }
      });

      GL.bindFramebuffer(GL.FRAMEBUFFER, this.rttFrameBuffer);
      GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
    }

    // ## Accesseur *projection*
    // Cet accesseur retourne la matrice de projection de la caméra.
    // Elle est utilisée pour configurer le shader par le composant
    // SpriteSheetComponent.
    get projection() {
      const ratio = this.canvas.width / this.canvas.height;
      const viewWidth = ratio * this.viewHeight;
      const position = this.owner.getComponent('Position').worldPosition;
      const ortho = mat4.create();
      return mat4.ortho(ortho, position[0] - viewWidth, position[0] + viewWidth, -position[1] + this.viewHeight, -position[1] - this.viewHeight, position[2] + this.near, position[2] + this.far);
    }
  }

  // ## Propriété statique *current*
  // Pour simplifier l'exercice, la caméra courante est stockée
  // dans ce champ. Elle est utilisée par le composant SpriteSheetComponent
  CameraComponent.current = null;

  return CameraComponent;
});
