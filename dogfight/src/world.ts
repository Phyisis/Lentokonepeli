import { GameMap } from "./map";
import { Cache } from "./network/cache";
import { Player, PlayerStatus } from "./objects/player";
import { Flag } from "./objects/flag";
import { Ground } from "./objects/ground";
import { Hill } from "./objects/hill";
import { Runway } from "./objects/runway";
import { Tower } from "./objects/tower";
import { Trooper } from "./objects/trooper";
import { Water } from "./objects/water";
import { GameObject, GameObjectType } from "./object";
import { Team, FacingDirection, ROTATION_DIRECTIONS } from "./constants";
import { TakeoffRequest, TakeoffEntry } from "./takeoff";
import { teamPlanes, Plane } from "./objects/plane";
import { InputQueue, InputKey, KeyChangeList } from "./input";

/**
 * The Game World contains all entites,
 * World state, etc. of a game.
 */
export class GameWorld {
  // A cache of changes to send, refreshed on every tick.
  private cache: Cache = {};

  // A queue of takeoff requests to be processed.
  private takeoffQueue: TakeoffEntry[];
  private inputQueue: InputQueue;

  private players: Player[];
  private flags: Flag[];
  private grounds: Ground[];
  private hills: Hill[];
  private runways: Runway[];
  private towers: Tower[];
  private waters: Water[];
  private planes: Plane[];
  private troopers: Trooper[];

  // god please forgive me for this sin
  private objectArrays = {
    [GameObjectType.Player]: "players",
    [GameObjectType.Flag]: "flags",
    [GameObjectType.Ground]: "grounds",
    [GameObjectType.Hill]: "hills",
    [GameObjectType.Runway]: "runways",
    [GameObjectType.ControlTower]: "towers",
    [GameObjectType.Trooper]: "troopers",
    [GameObjectType.Water]: "waters",
    [GameObjectType.Plane]: "planes"
  };

  // Next available ID, incremented by 1.
  // Always counts up, never resets.
  private idCounter = 0;

  public constructor() {
    this.resetWorld();
  }

  public clearCache(): void {
    this.cache = {};
  }

  private resetWorld(): void {
    this.clearCache();
    this.takeoffQueue = [];
    this.inputQueue = {};

    this.players = [];
    this.flags = [];
    this.grounds = [];
    this.hills = [];
    this.runways = [];
    this.towers = [];
    this.troopers = [];
    this.waters = [];
    this.planes = [];
  }

  /**
   * Processes a step of the game simulation.
   *
   * Updates physics, checks collisions, creates/destroys entities,
   * and returns the changes.
   *
   * @param timestep Number of milliseconds to advance simulation
   */
  public tick(deltaTime: number): Cache {
    this.processInputs();
    this.processTakeoffs();
    this.processPlanes(deltaTime);
    return this.cache;
  }

  private processPlanes(deltaTime: number): void {
    this.planes.forEach((plane): void => {
      plane.tick(this.cache, deltaTime);

      // if fuel has run out, kill entity.
      if (plane.fuel <= 0) {
        //this.removeObject(plane);
      }
    });
  }

  public queueInput(id: number, key: InputKey, value: boolean): void {
    if (this.inputQueue[id] === undefined) {
      this.inputQueue[id] = {};
    }
    this.inputQueue[id][key] = value;
  }

  private processInputs(): void {
    // process input...
    for (const playerID in this.inputQueue) {
      const id = parseInt(playerID);
      const player = this.getObject(GameObjectType.Player, id) as Player;
      if (player === undefined) {
        return;
      }
      const cID = player.controlID;
      const cType = player.controlType;
      const controlling = this.getObject(cType, cID);
      if (controlling !== undefined) {
        switch (cType) {
          case GameObjectType.Plane: {
            this.planeInput(player, controlling as Plane, this.inputQueue[id]);
            break;
          }
        }
      }
    }
    // reset queue
    this.inputQueue = {};
  }

  public planeInput(
    player: Player,
    plane: Plane,
    changes: KeyChangeList
  ): void {
    for (const keyType in changes) {
      const key: InputKey = parseInt(keyType);
      const isPressed = changes[keyType];
      switch (key) {
        case InputKey.Left:
        case InputKey.Right: {
          break;
        }
        case InputKey.Up: {
          if (isPressed) {
            plane.setFlipped(this.cache, !plane.flipped);
          }
          break;
        }
        case InputKey.Down: {
          if (isPressed) {
            plane.setEngine(this.cache, !plane.engineOn);
          }
          break;
        }
        case InputKey.Jump: {
          // temporary, just destroy the plane for now.
          if (isPressed) {
            this.removeObject(plane);
            // set player info to pre-flight
            player.setStatus(this.cache, PlayerStatus.Takeoff);
            player.setControl(this.cache, GameObjectType.None, 0);
          }
          break;
        }
      }
    }
    if (player.inputState[InputKey.Left] && !player.inputState[InputKey.Right])
      plane.setRotation(this.cache, InputKey.Left, true);
    if (!player.inputState[InputKey.Left] && player.inputState[InputKey.Right])
      plane.setRotation(this.cache, InputKey.Right, true);
    if (player.inputState[InputKey.Left] == player.inputState[InputKey.Right])
      plane.setRotation(this.cache, InputKey.Right, false);
  }

  private processTakeoffs(): void {
    for (const takeoff of this.takeoffQueue) {
      this.doTakeoff(takeoff);
    }
    this.takeoffQueue = [];
  }

  private doTakeoff(takeoff: TakeoffEntry): void {
    // test if player exists
    const player = this.getObject(
      GameObjectType.Player,
      takeoff.playerID
    ) as Player;
    if (player === undefined) {
      return;
    }
    // make sure he's not controlling anything
    if (player.controlType !== GameObjectType.None) {
      return;
    }
    const runway = this.getObject(
      GameObjectType.Runway,
      takeoff.request.runway
    ) as Runway;
    if (runway === undefined) {
      return;
    }
    // make sure runway isn't dead
    if (runway.health <= 0) {
      return;
    }
    // create plane
    const plane = new Plane(
      this.nextID(),
      this.cache,
      takeoff.request.plane,
      player.team
    );
    let offsetX = 100;
    let simpleDirection = -1;
    if (runway.direction == FacingDirection.Right) {
      offsetX *= -1;
      simpleDirection = 1;
    }
    plane.setPos(this.cache, runway.x + offsetX, 10);
    plane.setVelocity(this.cache, plane.minSpeed * simpleDirection * 1.1, 0);
    plane.setFlipped(this.cache, runway.direction == FacingDirection.Left);
    const direction =
      runway.direction == FacingDirection.Left
        ? Math.round(ROTATION_DIRECTIONS / 2)
        : 0;
    plane.setDirection(this.cache, direction);
    this.planes.push(plane);
    // assign plane to player
    player.setControl(this.cache, plane.type, plane.id);
    player.setStatus(this.cache, PlayerStatus.Playing);
  }

  /**
   * Adds a player to the game,
   * and returns the information.
   */
  public addPlayer(team: Team): Player {
    const player = new Player(this.nextID(), this.cache);
    player.set(this.cache, "team", team);
    this.addObject(player);
    return player;
  }

  public removePlayer(p: Player): void {
    this.removeObject(p);
  }

  private getObject(type: GameObjectType, id: number): GameObject | undefined {
    const index = this.getObjectIndex(type, id);
    if (index < 0) {
      return undefined;
    }
    const array = this[this.objectArrays[type]];
    return array[index];
  }

  public getState(): Cache {
    const objects = [
      this.players,
      this.flags,
      this.grounds,
      this.hills,
      this.runways,
      this.towers,
      this.troopers,
      this.waters,
      this.planes
    ];
    const cache: Cache = {};
    for (const obj in objects) {
      for (const thing of objects[obj]) {
        cache[thing.id] = thing.getState();
      }
    }
    return cache;
  }

  private addObject(obj: GameObject): void {
    const arr = this[this.objectArrays[obj.type]];
    arr.push(obj);
    this.cache[obj.id] = obj.getState();
  }

  private removeObject(obj: GameObject): void {
    const index = this.getObjectIndex(obj.type, obj.id);
    if (index < 0) {
      return;
    }
    const type = obj.type;
    const id = obj.id;

    const arr = this[this.objectArrays[obj.type]];
    arr.splice(index, 1);

    // Create an empty update in the cache.
    // The renderer treats an empty update as a deletion.
    this.cache[id] = {
      type
    };
  }

  /**
   * Returns the index of an object in the array.
   * @param arr Array of game objects to search through.
   * @param id The ID of the object to find.
   */
  private getObjectIndex(type: GameObjectType, id: number): number {
    let index = -1;
    if (type === GameObjectType.None) {
      return index;
    }
    const array = this[this.objectArrays[type]];
    for (let i = 0; i < array.length; i++) {
      if (array[i].id === id) {
        index = i;
        break;
      }
    }
    return index;
  }

  public nextID(): number {
    return this.idCounter++;
  }

  public requestTakeoff(player: Player, takeoffRequest: TakeoffRequest): void {
    const team = player.team;
    const { plane, runway } = takeoffRequest;
    if (!teamPlanes[team].includes(plane)) {
      return;
    }
    const runwayID = this.getObjectIndex(GameObjectType.Runway, runway);
    // if runway exists, add request to queue to be processed.
    if (runwayID >= 0) {
      this.takeoffQueue.push({
        playerID: player.id,
        request: takeoffRequest
      });
    }
  }

  public loadMap(map: GameMap): void {
    map.grounds.forEach((ground): void => {
      const obj = new Ground(this.nextID(), this.cache);
      obj.setData(this.cache, ground);
      this.grounds.push(obj);
    });
    map.flags.forEach((flag): void => {
      const obj = new Flag(this.nextID(), this.cache);
      obj.setData(this.cache, flag);
      this.flags.push(obj);
    });
    map.hills.forEach((hill): void => {
      const obj = new Hill(this.nextID(), this.cache);
      obj.setData(this.cache, hill);
      this.hills.push(obj);
    });
    map.runways.forEach((runway): void => {
      const obj = new Runway(this.nextID(), this.cache);
      obj.setData(this.cache, runway);
      this.runways.push(obj);
    });
    map.towers.forEach((tower): void => {
      const obj = new Tower(this.nextID(), this.cache);
      obj.setData(this.cache, tower);
      this.towers.push(obj);
    });
    map.waters.forEach((water): void => {
      const obj = new Water(this.nextID(), this.cache);
      obj.setData(this.cache, water);
      this.waters.push(obj);
    });
  }
}
