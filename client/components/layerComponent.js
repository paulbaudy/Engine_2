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


  // # Classe *LayerComponent*
  // Ce composant représente un ensemble de sprites qui
  // doivent normalement être considérées comme étant sur un
  // même plan.
  class LayerComponent extends Component {
    // ## Méthode *display*
    // La méthode *display* est appelée une fois par itération
    // de la boucle de jeu.
    display( /*frame*/ ) {
      let GL = GraphicsAPI.context;

      const layerSprites = this.listSprites();
      if (layerSprites.length === 0) {
        return;
      }
      const spriteSheet = layerSprites[0].spriteSheet;
      if(!spriteSheet)
        return;

      var numSprites = 0;
      layerSprites.forEach(function(sprite) {
        if(sprite) {
          if(sprite.vertices)
             numSprites++;
        }
      });

      var vBuffer = GL.createBuffer();
      GL.bindBuffer(GL.ARRAY_BUFFER, vBuffer);
      var vertices = new Float32Array((4 *numSprites* TextureComponent.vertexSize)); /* array with vertices of all sprites */
      var i = 0; /* vertices indice */
      layerSprites.forEach(function(sprite) {
        if(sprite) {
          if(sprite.vertices) {
            sprite.vertices.forEach(function(v) {
                 vertices[i] = v;
                 i++;
            });
          }
        }
      });
      GL.bufferData(GL.ARRAY_BUFFER, vertices, GL.DYNAMIC_DRAW);

      var iBuffer = GL.createBuffer();
      GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, iBuffer);
      var indices = new Uint16Array(6*numSprites);
      var i = 0;
      var j = 0; /* offset */
      for(i = 0; i<6*numSprites; i+=6) {
        indices[i] = 0+j;
        indices[i+1] = 1+j;
        indices[i+2] = 2+j;
        indices[i+3] = 2+j;
        indices[i+4] = 3+j;
        indices[i+5] = 0+j;
        j+=4;
      }
      GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, indices, GL.DYNAMIC_DRAW);

      spriteSheet.bind();
      GL.drawElements(GL.TRIANGLES, 6*numSprites, GL.UNSIGNED_SHORT, 0);
      spriteSheet.unbind();

      return Promise.resolve();
    }

    // ## Fonction *listSprites*
    // Cette fonction retourne une liste comportant l'ensemble
    // des sprites de l'objet courant et de ses enfants.
    listSprites() {
      const sprites = [];
      this.listSpritesRecursive(this.owner, sprites);
      return sprites;
    }

    listSpritesRecursive(obj, sprites) {
      if (!obj.active) {
        return;
      }

      const objSprite = obj.getComponent('Sprite');
      if (objSprite && objSprite.enabled) {
        sprites.push(objSprite);
      }
      Object.keys(obj.children).forEach((k) => {
        const child = obj.children[k];
        this.listSpritesRecursive(child, sprites);
      });
    }
  }

  return LayerComponent;
});
