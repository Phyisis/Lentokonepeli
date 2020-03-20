import { FacingDirection, Team } from "../constants";
import { GameObject, GameObjectType } from "../object";
import { Cache, CacheEntry } from "../network/cache";

export class Runway extends GameObject {
  public type = GameObjectType.Runway;

  public x: number;
  public y: number;
  public direction: FacingDirection;
  public team: Team;
  public health: number;

  public constructor(id: number, cache: Cache) {
    super(id, cache);
    this.setData({
      x: 0,
      y: 0,
      direction: FacingDirection.Right,
      team: Team.Centrals,
      health: 255
    });
  }

  public getState(): CacheEntry {
    return {
      type: this.type
    };
  }
}
