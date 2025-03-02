import * as PIXI from "pixi.js";
import { GameSprite } from "../sprite";
import { DrawLayer, WaterColor } from "../constants";
import { FacingDirection } from "../../../../dogfight/src/constants";

const WAVE_PHASE_TIME = 200; // Milliseconds
const WATER_HEIGHT = 10000;
const WAVE_TEXTURE_STR = "wave-l_N.gif";

export class WaterSprite extends GameSprite {
  public x: number;
  public y: number;
  public width: number;
  public direction: FacingDirection;

  private spritesheet: PIXI.Spritesheet;

  private container: PIXI.Container;
  private water: PIXI.Graphics;
  private waves: PIXI.TilingSprite;

  private color: WaterColor;
  private wavePhase: number;
  private windowInterval: number;

  public constructor(spritesheet: PIXI.Spritesheet) {
    super();

    this.x = 0;
    this.y = 0;
    this.width = 500;
    this.direction = FacingDirection.Right;

    this.color = WaterColor.Normal;
    this.wavePhase = 1;

    this.spritesheet = spritesheet;

    this.container = new PIXI.Container();

    this.water = new PIXI.Graphics();
    const texStr = this.getWaveTextureString();
    const texture = spritesheet.textures[texStr];
    this.waves = new PIXI.TilingSprite(texture);
    this.waves.height = texture.height;

    this.container = new PIXI.Container();
    this.container.zIndex = DrawLayer.Water;

    this.container.addChild(this.water);
    this.container.addChild(this.waves);

    this.windowInterval = window.setInterval((): void => {
      this.phaseWave();
    }, WAVE_PHASE_TIME);

    this.renderables.push(this.container);
  }

  private phaseWave(): void {
    this.wavePhase = this.wavePhase == 7 ? 1 : this.wavePhase + 1;
    const texStr = this.getWaveTextureString();
    const texture = this.spritesheet.textures[texStr];
    this.waves.texture = texture;
  }

  private getWaveTextureString(): string {
    return WAVE_TEXTURE_STR.replace("N", this.wavePhase.toString());
  }

  public redraw(): void {
    // create water
    this.water.clear();
    this.water.beginFill(this.color);
    this.water.drawRect(0, 0, this.width, WATER_HEIGHT);
    this.water.endFill();
    this.waves.width = this.width;

    // set wave directions
    if (this.direction == FacingDirection.Right) {
      this.waves.scale.x = -1;
      this.waves.position.x = this.waves.width;
    }

    // center water.
    const halfWidth = Math.round(this.container.width / 2);
    this.container.x = this.x - halfWidth;

    // set water y-offset
    this.container.y = this.y;
  }

  public destroy(): void {
    window.clearInterval(this.windowInterval);
  }
}
