import { spriteSheet } from "./render/textures";
import { DogfightEngine } from "../../dogfight/src/engine";
import { State } from "../../dogfight/src/state";
import { MAP_CLASSIC } from "../../dogfight/src/maps/classic";
import { GameRenderer } from "./render/renderer";
import { CanvasEventHandler } from "./render/event";

export class GameClient {
  /**
   * A local instance of the Dogfight Engine.
   * This is helpful for processing entity
   * movement between state updates
   * (client side prediction)
   */
  private localEngine: DogfightEngine;

  /**
   * A local instance of the Dogfight Renderer.
   * This takes game changes and renders a world
   * based on those changes.
   */
  private localRenderer: GameRenderer;

  private canvasHandler: CanvasEventHandler;

  private startTime = Date.now();
  private lastTick: number = 0;

  public constructor() {
    console.log("Initializing Game Client..");
    this.localEngine = new DogfightEngine();
    this.localEngine.loadMap(MAP_CLASSIC);
    // create renderer
    this.localRenderer = new GameRenderer(spriteSheet);

    // create canvas event handler
    this.canvasHandler = new CanvasEventHandler(this.localRenderer);
    this.canvasHandler.addListeners();

    // center camera
    this.localRenderer.centerCamera(0, 0);

    // Draw it to the screen
    const div = document.getElementById("app");
    div.appendChild(this.localRenderer.getView());

    // get local engine state and pass it to renderer...
    const state = this.getState();
    this.localRenderer.renderStateList(state);
  }

  public loop(): void {
    const currentTick = Date.now() - this.startTime;
    const deltaTime = currentTick - this.lastTick;
    // console.log(deltaTime, this.lastTick);
    const updates = this.localEngine.tick(deltaTime);
    this.localRenderer.renderStateList(updates);
    this.lastTick = currentTick;

    window.requestAnimationFrame((): void => {
      this.loop();
    });
  }

  /**
   * Request the entire state of the world.
   * Right now it only returns the local engine's state.
   *
   * In the future, this will request it from the network
   * and unpack the data.
   */
  private getState(): State[] {
    return this.localEngine.getState();
  }
}
