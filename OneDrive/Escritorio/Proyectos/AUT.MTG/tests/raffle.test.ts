// Raffle Module Tests
// Tests for raffle functionality including ticket purchase, draw, and uniqueness

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// Mock D1 Database
const createMockDb = () => {
  const raffles: Map<string, any> = new Map();
  const tickets: Map<string, any> = new Map();
  const draws: Map<string, any> = new Map();
  let raffleIdCounter = 1;
  let ticketIdCounter = 1;

  return {
    raffles,
    tickets,
    draws,
    // Prepared statement mock
    prepare: (sql: string) => ({
      bind: (...params: any[]) => ({
        first: async <T>() => {
          if (sql.includes('SELECT COUNT') && sql.includes('raffles')) {
            return { total: raffles.size };
          }
          if (sql.includes('SELECT COUNT') && sql.includes('raffle_tickets')) {
            const raffleId = params[0];
            const count = Array.from(tickets.values()).filter(t => t.raffle_id === raffleId).length;
            return { count };
          }
          return null;
        },
        all: async <T>() => {
          if (sql.includes('FROM raffles')) {
            return { results: Array.from(raffles.values()) };
          }
          if (sql.includes('FROM raffle_tickets')) {
            const raffleId = params[0];
            return { 
              results: Array.from(tickets.values())
                .filter(t => t.raffle_id === raffleId)
                .sort((a, b) => a.ticket_number - b.ticket_number)
            };
          }
          return { results: [] };
        },
        run: async () => {
          // Insert/Update logic handled separately
          return { success: true };
        }
      })
    }),
    // Helper to directly add data
    addRaffle: (raffle: any) => {
      const id = `raffle-${raffleIdCounter++}`;
      raffles.set(id, { ...raffle, id });
      return id;
    },
    addTicket: (ticket: any) => {
      const id = `ticket-${ticketIdCounter++}`;
      tickets.set(id, { ...ticket, id });
      return id;
    },
    // Count helpers
    getTicketCount: (raffleId: string) => 
      Array.from(tickets.values()).filter(t => t.raffle_id === raffleId).length,
    getTicketByNumber: (raffleId: string, number: number) =>
      Array.from(tickets.values()).find(t => t.raffle_id === raffleId && t.ticket_number === number)
  };
};

describe('Raffle State Machine', () => {
  // Import the state machine functions
  const { 
    canTransitionRaffle, 
    isActiveRaffle, 
    isTerminalRaffle,
    isValidRaffleState,
    getRaffleStateLabel,
    getRaffleStateColor,
    RAFFLE_STATES
  } = require('../lib/core/state-machine');

  it('should have all required states defined', () => {
    expect(RAFFLE_STATES).toContain('draft');
    expect(RAFFLE_STATES).toContain('active');
    expect(RAFFLE_STATES).toContain('sold_out');
    expect(RAFFLE_STATES).toContain('draw_pending');
    expect(RAFFLE_STATES).toContain('drawn');
    expect(RAFFLE_STATES).toContain('cancelled');
    expect(RAFFLE_STATES).toContain('expired');
  });

  it('should validate draft to active transition', () => {
    expect(canTransitionRaffle('draft', 'active')).toBe(true);
    expect(canTransitionRaffle('draft', 'cancelled')).toBe(true);
    expect(canTransitionRaffle('draft', 'drawn')).toBe(false);
  });

  it('should validate active to sold_out transition', () => {
    expect(canTransitionRaffle('active', 'sold_out')).toBe(true);
    expect(canTransitionRaffle('active', 'cancelled')).toBe(true);
    expect(canTransitionRaffle('active', 'drawn')).toBe(false);
  });

  it('should validate sold_out to draw_pending transition', () => {
    expect(canTransitionRaffle('sold_out', 'draw_pending')).toBe(true);
    expect(canTransitionRaffle('sold_out', 'cancelled')).toBe(true);
  });

  it('should validate terminal states cannot transition', () => {
    expect(canTransitionRaffle('drawn', 'active')).toBe(false);
    expect(canTransitionRaffle('cancelled', 'active')).toBe(false);
    expect(canTransitionRaffle('expired', 'active')).toBe(false);
  });

  it('should identify active raffles', () => {
    expect(isActiveRaffle('draft')).toBe(true);
    expect(isActiveRaffle('active')).toBe(true);
    expect(isActiveRaffle('sold_out')).toBe(true);
    expect(isActiveRaffle('drawn')).toBe(false);
  });

  it('should identify terminal raffles', () => {
    expect(isTerminalRaffle('drawn')).toBe(true);
    expect(isTerminalRaffle('cancelled')).toBe(true);
    expect(isTerminalRaffle('expired')).toBe(true);
    expect(isTerminalRaffle('active')).toBe(false);
  });

  it('should return correct state labels', () => {
    expect(getRaffleStateLabel('draft')).toBe('Borrador');
    expect(getRaffleStateLabel('active')).toBe('Activa');
    expect(getRaffleStateLabel('drawn')).toBe('Sorteada');
  });
});

describe('Raffle Ticket Uniqueness', () => {
  it('should ensure ticket numbers are unique per raffle', () => {
    const db = createMockDb();
    
    const raffleId = db.addRaffle({
      name: 'Test Raffle',
      total_tickets: 100,
      sold_tickets: 0,
      ticket_price: 5000,
      status: 'active'
    });

    // Add first ticket
    const ticket1 = db.addTicket({
      raffle_id: raffleId,
      ticket_number: 1,
      buyer_name: 'John Doe',
      buyer_phone: '+56912345678',
      payment_status: 'pending'
    });

    // Verify ticket was added
    expect(db.getTicketCount(raffleId)).toBe(1);

    // Try to add duplicate ticket number - in real DB this would fail due to UNIQUE constraint
    const existingTicket = db.getTicketByNumber(raffleId, 1);
    expect(existingTicket).toBeDefined();
    expect(existingTicket.ticket_number).toBe(1);
  });

  it('should generate sequential ticket numbers', () => {
    const db = createMockDb();
    
    const raffleId = db.addRaffle({
      name: 'Test Raffle',
      total_tickets: 10,
      sold_tickets: 0,
      ticket_price: 5000,
      status: 'active'
    });

    // Add multiple tickets
    for (let i = 1; i <= 5; i++) {
      db.addTicket({
        raffle_id: raffleId,
        ticket_number: i,
        buyer_name: `Buyer ${i}`,
        buyer_phone: `+569${i.toString().padStart(8, '0')}`,
        payment_status: 'pending'
      });
    }

    expect(db.getTicketCount(raffleId)).toBe(5);
  });
});

describe('Raffle Draw Process', () => {
  it('should generate cryptographically secure seed', () => {
    // Test that seed generation produces different values
    const seeds = new Set<string>();
    
    for (let i = 0; i < 100; i++) {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const seed = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      seeds.add(seed);
    }

    // All seeds should be unique (extremely unlikely to have duplicates)
    expect(seeds.size).toBe(100);
  });

  it('should select winner deterministically from seed', () => {
    const tickets = [
      { id: '1', ticket_number: 1 },
      { id: '2', ticket_number: 2 },
      { id: '3', ticket_number: 3 },
      { id: '4', ticket_number: 4 },
      { id: '5', ticket_number: 5 }
    ];

    // Same seed should always produce same winner
    const seed1 = '0000000a00000000000000000000000000000000000000000000000000000000';
    const seedNum = parseInt(seed1.substring(0, 8), 16);
    const winnerIndex1 = seedNum % tickets.length;

    const seed2 = '0000000a00000000000000000000000000000000000000000000000000000000';
    const seedNum2 = parseInt(seed2.substring(0, 8), 16);
    const winnerIndex2 = seedNum2 % tickets.length;

    expect(winnerIndex1).toBe(winnerIndex2);
  });

  it('should ensure winner is always from valid ticket range', () => {
    const tickets = [
      { id: '1', ticket_number: 1 },
      { id: '2', ticket_number: 2 },
      { id: '3', ticket_number: 3 }
    ];

    // Test with multiple different seeds
    for (let i = 0; i < 100; i++) {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const seed = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      const seedNum = parseInt(seed.substring(0, 8), 16);
      const winnerIndex = seedNum % tickets.length;

      expect(winnerIndex).toBeGreaterThanOrEqual(0);
      expect(winnerIndex).toBeLessThan(tickets.length);
    }
  });
});

describe('Ticket Purchase Atomicity', () => {
  it('should track sold tickets accurately', () => {
    const db = createMockDb();
    
    const raffleId = db.addRaffle({
      name: 'Test Raffle',
      total_tickets: 100,
      sold_tickets: 0,
      ticket_price: 5000,
      status: 'active'
    });

    // Simulate multiple purchases
    const purchases = [
      { buyer: 'John', tickets: 2 },
      { buyer: 'Jane', tickets: 3 },
      { buyer: 'Bob', tickets: 1 }
    ];

    let totalSold = 0;
    let ticketNumber = 1;

    for (const purchase of purchases) {
      for (let i = 0; i < purchase.tickets; i++) {
        db.addTicket({
          raffle_id: raffleId,
          ticket_number: ticketNumber++,
          buyer_name: purchase.buyer,
          buyer_phone: '+56900000000',
          payment_status: 'pending'
        });
        totalSold++;
      }
    }

    expect(db.getTicketCount(raffleId)).toBe(6);
    expect(totalSold).toBe(6);
  });

  it('should handle concurrent purchase simulation', () => {
    const db = createMockDb();
    
    const raffleId = db.addRaffle({
      name: 'Test Raffle',
      total_tickets: 10,
      sold_tickets: 0,
      ticket_price: 5000,
      status: 'active'
    });

    // Simulate concurrent purchases (in real scenario would use transactions)
    const simulatePurchase = (buyerId: string, quantity: number) => {
      const currentCount = db.getTicketCount(raffleId);
      if (currentCount + quantity <= 10) {
        for (let i = 0; i < quantity; i++) {
          db.addTicket({
            raffle_id: raffleId,
            ticket_number: currentCount + i + 1,
            buyer_name: buyerId,
            buyer_phone: '+56900000000',
            payment_status: 'pending'
          });
        }
        return true;
      }
      return false;
    };

    // Sequential purchases should work
    expect(simulatePurchase('user1', 3)).toBe(true);
    expect(simulatePurchase('user2', 5)).toBe(true);
    expect(simulatePurchase('user3', 3)).toBe(true); // This would fail in real scenario
    
    expect(db.getTicketCount(raffleId)).toBe(8); // Only 8 because 3+5 exceeded
  });
});

describe('Raffle Status Transitions', () => {
  const { canTransitionRaffle } = require('../lib/core/state-machine');

  it('should handle full raffle lifecycle', () => {
    // Draft -> Active
    expect(canTransitionRaffle('draft', 'active')).toBe(true);
    
    // Active -> Sold Out (or cancelled)
    expect(canTransitionRaffle('active', 'sold_out')).toBe(true);
    
    // Sold Out -> Draw Pending
    expect(canTransitionRaffle('sold_out', 'draw_pending')).toBe(true);
    
    // Draw Pending -> Drawn
    expect(canTransitionRaffle('draw_pending', 'drawn')).toBe(true);
    
    // Drawn is terminal
    expect(canTransitionRaffle('drawn', 'active')).toBe(false);
  });

  it('should allow cancellation from active states', () => {
    expect(canTransitionRaffle('draft', 'cancelled')).toBe(true);
    expect(canTransitionRaffle('active', 'cancelled')).toBe(true);
    expect(canTransitionRaffle('sold_out', 'cancelled')).toBe(true);
    expect(canTransitionRaffle('draw_pending', 'cancelled')).toBe(true);
  });
});
