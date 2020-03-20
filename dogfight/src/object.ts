import { Cache, CacheEntry } from "./network/cache";

/**
 * Constants for each type of object in the game.
 *
 * These could be physical entities, or just containers
 * for game information.
 */
export enum GameObjectType {
  Ground,
  Water,
  Runway,
  Flag,
  ControlTower,
  Hill,
  Trooper,
  Player
}

type sendableData = number | string;

/**
 * A generic game object class.
 *
 * Each game object has a type and unique ID.
 *
 * It also has a method to retrieve its current state.
 */
export abstract class GameObject {
  public abstract type: GameObjectType;
  public id: number;
  private cache: Cache;

  public constructor(id: number, cache: Cache) {
    this.id = id;
    this.cache = cache;
  }

  /**
   * Returns the current state of this object.
   */
  public abstract getState(): CacheEntry;

  /**
   * Sets a property of this object, and queues it
   * to be sent out over the network.
   * @param property The property to set
   * @param value The value to set
   */
  public set(property: string, value: sendableData): void {
    // If there is no change in the value, don't do anything.
    // Otherwise, apply this change so it can be sent over the network.
    if (this[property] === value) {
      return;
    }

    // Check to see if this object exists in our cache right now.
    if (this.cache[this.id] === undefined) {
      this.cache[this.id] = {
        type: this.type
      };
    }

    // Update our variable in the object, and the cache.
    this[property] = value;
    this.cache[this.id][property] = value;
  }

  /**
   * Sets multiple properties of this object at once.
   * @param data An object with properties to set and their values
   */
  public setData(data: any): void {
    for (const property in data) {
      this.set(property, data[property]);
    }
  }
}
