import { Room, User } from './types.js';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private users: Map<string, User> = new Map();

  createRoom(roomId: string): Room {
    if (this.rooms.has(roomId)) {
      return this.rooms.get(roomId)!;
    }

    const room: Room = {
      id: roomId,
      users: new Set(),
      createdAt: new Date(),
    };

    this.rooms.set(roomId, room);
    return room;
  }

  joinRoom(userId: string, socketId: string, roomId: string): { success: boolean; room?: Room; error?: string } {
    try {
      let room = this.rooms.get(roomId);
      if (!room) {
        room = this.createRoom(roomId);
      }

      // Check if room is full (max 2 users for 1-on-1 video calling)
      if (room.users.size >= 2) {
        return { success: false, error: 'Room is full' };
      }

      // Remove user from previous room if exists
      const existingUser = this.users.get(userId);
      if (existingUser && existingUser.roomId) {
        this.leaveRoom(userId);
      }

      // Add user to room
      room.users.add(userId);
      this.users.set(userId, {
        id: userId,
        socketId,
        roomId,
      });

      return { success: true, room };
    } catch (error) {
      return { success: false, error: 'Failed to join room' };
    }
  }

  leaveRoom(userId: string): { success: boolean; roomId?: string } {
    const user = this.users.get(userId);
    if (!user || !user.roomId) {
      return { success: false };
    }

    const room = this.rooms.get(user.roomId);
    if (room) {
      room.users.delete(userId);
      
      // Clean up empty rooms
      if (room.users.size === 0) {
        this.rooms.delete(room.id);
      }
    }

    const roomId = user.roomId;
    this.users.delete(userId);
    
    return { success: true, roomId };
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  getUsersInRoom(roomId: string): User[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    return Array.from(room.users)
      .map(userId => this.users.get(userId))
      .filter((user): user is User => user !== undefined);
  }

  getRoomStats(): { totalRooms: number; totalUsers: number } {
    return {
      totalRooms: this.rooms.size,
      totalUsers: this.users.size,
    };
  }
}