define([
  'components/component',
  'components/textureComponent',
  'graphicsAPI',
], (
  Component,
  TextureComponent,
  GraphicsAPI
) => {
  'use strict';

  let GL = undefined;

  // # Classe *SpriteComponent*
  // Ce composant permet l'affichage d'une sprite pouvant
  // potentiellement être animée.
  class SpriteComponent extends Component {
    // ## Méthode *create*
    // Cette méthode est appelée pour configurer le composant avant
    // que tous les composants d'un objet aient été créés.
    create(descr) {
      let ref;

      this.animationEndedEvent = [];
      this.spriteName = descr.spriteName;
      this.isAnimated = (ref = descr.isAnimated) !== undefined ? ref : false;
      this.frameSkip = (ref = descr.frameSkip) !== undefined ? ref : 1;
      this.animWait = (ref = descr.animWait) !== undefined ? ref : 0;
      this.animationFrame = 1;
      this.animWaitCounter = this.animWait;
      return Promise.resolve();
    }

    // ## Méthode *setup*
    setup(descr) {
      GL = GraphicsAPI.context;

      // On récupère ici la feuille de sprite correspondant à ce composant.
      this.spriteSheet = this.findComponent(descr.spriteSheet);

      // On crée ici un tableau de 4 vertices permettant de représenter
      // le rectangle à afficher.
      this.vertexBuffer = GL.createBuffer();
      GL.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
      this.vertices = new Float32Array(4 * TextureComponent.vertexSize);
      GL.bufferData(GL.ARRAY_BUFFER, this.vertices, GL.DYNAMIC_DRAW);

      // On crée ici un tableau de 6 indices, soit 2 triangles, pour
      // représenter quels vertices participent à chaque triangle:
      // ```
      // 0    1
      // +----+
      // |\   |
      // | \  |
      // |  \ |
      // |   \|
      // +----+
      // 3    2
      // ```
      this.indexBuffer = GL.createBuffer();
      GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
      const indices = new Uint16Array([0, 1, 2, 2, 3, 0]);
      GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, indices, GL.DYNAMIC_DRAW);

      // Et on initialise le contenu des vertices
      this.updateMesh();
      return Promise.resolve();
    }

    // ## Méthode *update*
    // Cette méthode met à jour l'animation de la sprite, si il
    // y a lieu, et met à jour le contenu des vertices afin de tenir
    // compte des changements de position et autres.
    update(frame) {
      if (this.isAnimated) {
        if (this.animWaitCounter > 0) {
          this.animWaitCounter--;
        } else if ((frame % this.frameSkip) === 0) {
          this.updateMesh();
        }
      }

      this.updateComponents(this.descr);
    }

    // ## Méthode *display*
    // La méthode *display* choisit le shader et la texture appropriée
    // via la méthode *bind* de la feuille de sprite, sélectionne le
    // tableau de vertices et d'indices et fait l'appel de rendu.
    display( /*frame*/ ) {
      /* GL.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
      GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
      this.spriteSheet.bind();
      GL.drawElements(GL.TRIANGLES, 6, GL.UNSIGNED_SHORT, 0);
      this.spriteSheet.unbind(); */
    }

    // ## Méthode *updateMesh*
    // Cette méthode met à jour les informations relatives à la sprite
    // à afficher.
    updateMesh() {
      const spriteName = this.isAnimated ? this.findNextFrameName() : this.spriteName;
      if (!this.spriteSheet.sprites[spriteName]) {
        console.error(spriteName, this.spriteName, this.owner);
        return;
      }
      this.descr = this.spriteSheet.sprites[spriteName];
      this.spriteSize = this.descr.sourceSize;
    }

    // ## Fonction *findNextFrameName*
    // La fonction *findNextFrameName* détermine le nom de la sprite
    // à afficher dans une animation, et déclenche des événements
    // enregistrés si on atteint la fin de l'animation.
    findNextFrameName() {
      const animationSprite = `${this.spriteName}${this.animationFrame}`;
      if (this.spriteSheet.sprites[animationSprite]) {
        this.animationFrame++;
        return animationSprite;
      }
      if (this.animationFrame === 1) {
        return this.spriteName;
      } else {
        this.animationFrame = 1;
        this.animWaitCounter = this.animWait;
        this.animationEndedEvent.forEach((e) => {
          e();
        });
        return this.findNextFrameName();
      }
    }

    // ## Méthode *updateComponents*
    // Cette méthode met à jour le contenu de chaque vertex, soient
    // leurs position et les coordonnées de texture, en tenant compte
    // des transformations et de la sprite courante.
    updateComponents(descr) {
      const position = this.owner.getComponent('Position').worldPosition;

      const z = position[2];
      const xMin = position[0];
      const xMax = xMin + descr.frame.w;
      const yMax = position[1];
      const yMin = yMax - descr.frame.h;
      const uMin = descr.uv.x;
      const uMax = uMin + descr.uv.w;
      const vMin = descr.uv.y;
      const vMax = vMin + descr.uv.h;

      const v = [
        xMin, yMin, z, uMin, vMin,
        xMax, yMin, z, uMax, vMin,
        xMax, yMax, z, uMax, vMax,
        xMin, yMax, z, uMin, vMax,
      ];

      let offset = 0;
      this.vertices.set(v, offset);
      GL.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
      GL.bufferSubData(GL.ARRAY_BUFFER, offset, this.vertices);
    }
  }

  return SpriteComponent;
});
