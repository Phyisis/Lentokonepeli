import { GameMap } from "./map";
import { GameState, StateAction, Change } from "./state";
import { FlagObject } from "./objects/flag";
import { GroundObject } from "./objects/ground";
import { RunwayObject } from "./objects/runway";
import { TowerObject } from "./objects/tower";
import { TrooperObject, TrooperState } from "./objects/trooper";
import { WaterObject } from "./objects/water";
import { HillObject } from "./objects/hill";
import { getUniqueID, GameObjectType } from "./object";
import { PlayerObject } from "./objects/player";

/**
 * The Game World contains all entites,
 * World state, etc. of a game.
 */
export class GameWorld {
  // A list of changes from this tick.
  private changes: GameState;

  private players: PlayerObject[];

  private flags: FlagObject[];
  private grounds: GroundObject[];
  private hills: HillObject[];
  private runways: RunwayObject[];
  private towers: TowerObject[];
  private troopers: TrooperObject[];
  private waters: WaterObject[];

  public constructor() {
    this.changes = {};
    this.resetWorld();
    this.debug();
  }

  private resetChanges(): void {
    this.changes = {};
    for (const index in GameObjectType) {
      this.changes[index] = {};
    }
  }

  private resetWorld(): void {
    this.resetChanges();
    this.players = [];
    this.flags = [];
    this.grounds = [];
    this.hills = [];
    this.runways = [];
    this.towers = [];
    this.troopers = [];
    this.waters = [];
  }

  public debug(): void {
    // create a player
    this.players.push(new PlayerObject(getUniqueID(this.players)));
    const troop = new TrooperObject(getUniqueID(this.troopers));
    troop.setData({ state: TrooperState.Parachuting, x: 0, y: 250 });
    this.troopers.push(troop);
  }

  /**
   * Processes a step of the game simulation.
   *
   * Updates physics, checks collisions, creates/destroys entities,
   * and returns the changes.
   *
   * @param timestep Number of milliseconds to advance simulation
   */
  public tick(timestamp: number): GameState {
    this.resetChanges();
    return this.changes;
  }

  public logWorld(): void {
    console.log("Game World:");
  }

  private change(diff: Change): void {
    if (this.changes[diff.type][diff.id] == undefined) {
      this.changes[diff.type][diff.id] = {
        action: StateAction.Update,
        data: {}
      };
    }
    this.changes[diff.type][diff.id].data = diff.data;
  }

  public getState(): GameState {
    const objects = [
      this.players,
      this.flags,
      this.grounds,
      this.hills,
      this.runways,
      this.towers,
      this.troopers,
      this.waters
    ];

    const state: GameState = {};
    for (const objtype in objects) {
      const arr = objects[objtype];
      for (const index in arr) {
        const obj = arr[index];
        const id = obj.id;
        const type = obj.type;
        if (state[type] == undefined) {
          state[type] = {};
        }
        state[type][id] = {
          action: StateAction.Create,
          data: obj.getState()
        };
      }
    }

    return state;
  }

  public loadMap(map: GameMap): void {
    map.grounds.forEach((ground): void => {
      const obj = new GroundObject(getUniqueID(this.grounds));
      obj.setData(ground);
      this.grounds.push(obj);
    });
    map.flags.forEach((flag): void => {
      const obj = new FlagObject(getUniqueID(this.flags));
      obj.setData(flag);
      this.flags.push(obj);
    });
    map.hills.forEach((hill): void => {
      const obj = new HillObject(getUniqueID(this.hills));
      obj.setData(hill);
      this.hills.push(obj);
    });
    map.runways.forEach((runway): void => {
      const obj = new RunwayObject(getUniqueID(this.runways));
      obj.setData(runway);
      this.runways.push(obj);
    });
    map.towers.forEach((tower): void => {
      const obj = new TowerObject(getUniqueID(this.towers));
      obj.setData(tower);
      this.towers.push(obj);
    });
    map.waters.forEach((water): void => {
      const obj = new WaterObject(getUniqueID(this.waters));
      obj.setData(water);
      this.waters.push(obj);
    });
  }
}
