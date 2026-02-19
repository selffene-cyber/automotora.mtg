// ============================================================
// API: Public Consignment Submission
// MTG Automotora - Plataforma MVP
// Descripcion: Endpoint público para que clientes envíen solicitudes de consignación
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createConsignment, findConsignmentByPhone, getConsignmentStats } from '@/lib/db/consignments';
import { logConsignmentCreated } from '@/lib/core/audit';
import { z } from 'zod';

// ============================================================
// SCHEMAS DE VALIDACIÓN
// ============================================================

/**
 * Schema para validación de consignación pública
 */
const createConsignmentSchema = z.object({
  // Honeypot field - debe estar vacío
  website: z.string().max(0).optional(),
  
  // Datos requeridos
  owner_name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres').max(100),
  owner_phone: z.string().min(8, 'Teléfono debe tener al menos 8 dígitos').max(20),
  
  // Datos opcionales
  owner_email: z.string().email('Email inválido').optional().or(z.literal('')),
  brand: z.string().min(1, 'Marca es requerida').max(50),
  model: z.string().min(1, 'Modelo es requerido').max(50),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  expected_price: z.number().positive('Precio debe ser positivo').optional(),
  notes: z.string().max(1000).optional(),
});

// ============================================================
// HELPERS
// ============================================================

/**
 * Limpia y normaliza datos de entrada
 */
function sanitizeInput(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = value.trim();
    } else if (typeof value === 'number') {
      sanitized[key] = value;
    } else if (value !== undefined && value !== null) {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Valida formato de teléfono chileno
 */
function isValidChileanPhone(phone: string): boolean {
  // Acepta formatos: +569XXXXXXXX, 569XXXXXXXX, 09XXXXXXXX, XXXXXXXXX
  const cleaned = phone.replace(/\s|-/g, '');
  const phoneRegex = /^(\+?56|0)?9\d{8}$/;
  return phoneRegex.test(cleaned);
}

// ============================================================
// POST - Crear nueva consignación (público)
// ============================================================

/**
 * POST - Cliente envía solicitud de consignación
 * 
 * Request body:
 * {
 *   owner_name: string (required),
 *   owner_phone: string (required),
 *   owner_email?: string,
 *   brand: string (required),
 *   model: string (required),
 *   year: number (required),
 *   expected_price?: number,
 *   notes?: string,
 *   website?: string (honeypot - debe estar vacío)
 * }
 * 
 * Response (201):
 * {
 *   success: true,
 *   consignment_id: string,
 *   message: string
 * }
 * 
 * Response (400):
 * {
 *   success: false,
 *   error: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ============================================================
    // HONEYPOT CHECK - Protección contra bots
    // ============================================================
    // Si el campo website tiene contenido, es probable que sea un bot
    if (body.website && body.website.length > 0) {
      // Simulamos éxito pero no procesamos
      console.log('[Consignment] Honeypot triggered - posible bot detectado');
      return NextResponse.json({
        success: true,
        consignment_id: 'dummy',
        message: 'Solicitud recibida'
      }, { status: 201 });
    }

    // ============================================================
    // VALIDACIÓN CON ZOD
    // ============================================================
    const sanitizedBody = sanitizeInput(body);
    const validationResult = createConsignmentSchema.safeParse(sanitizedBody);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => e.message).join(', ');
      return NextResponse.json(
        { success: false, error: errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // ============================================================
    // VALIDACIÓN ADICIONAL DE TELÉFONO
    // ============================================================
    if (!isValidChileanPhone(data.owner_phone)) {
      return NextResponse.json(
        { success: false, error: 'Formato de teléfono inválido. Use formato chileno (ej: +569XXXXXXXX)' },
        { status: 400 }
      );
    }

    // ============================================================
    // CREAR CONSIGNACIÓN
    // ============================================================
    const consignment = await createConsignment({
      owner_name: data.owner_name,
      owner_email: data.owner_email || undefined,
      owner_phone: data.owner_phone,
      brand: data.brand,
      model: data.model,
      year: data.year,
      expected_price: data.expected_price || undefined,
      notes: data.notes || undefined,
    });

    // ============================================================
    // REGISTRAR AUDITORÍA
    // ============================================================
    await logConsignmentCreated(consignment.id, null);

    console.log(`[Consignment] Nueva solicitud creada: ${consignment.id}`);

    return NextResponse.json({
      success: true,
      consignment_id: consignment.id,
      message: 'Solicitud de consignación enviada exitosamente. Nos contactaremos pronto.'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating consignment:', error);
    return NextResponse.json(
      { success: false, error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}

// ============================================================
// GET - Información del endpoint y búsqueda por teléfono
// ============================================================

/**
 * GET - Obtiene información del endpoint o busca por teléfono
 * 
 * Query params:
 * - phone: número de teléfono para buscar estado
 * 
 * Response:
 * {
 *   endpoint: string,
 *   description: string,
 *   methods: object,
 *   // Si se proporciona phone:
 *   status?: string,
 *   consignment?: object
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    // Si se proporciona teléfono, buscar estado
    if (phone) {
      const consignment = await findConsignmentByPhone(phone);

      if (!consignment) {
        return NextResponse.json({
          success: true,
          message: 'No se encontró consignación con ese teléfono',
          status: null
        });
      }

      return NextResponse.json({
        success: true,
        status: consignment.status,
        consignment: {
          id: consignment.id,
          brand: consignment.brand,
          model: consignment.model,
          year: consignment.year,
          created_at: consignment.created_at
        }
      });
    }

    // Devolver información del endpoint
    const stats = await getConsignmentStats();

    return NextResponse.json({
      endpoint: 'Consignment Submission',
      description: 'API pública para enviar solicitudes de consignación de vehículos',
      stats: {
        total: stats.total,
        received: stats.received,
        under_review: stats.under_review,
        approved: stats.approved,
        rejected: stats.rejected,
        published: stats.published
      },
      methods: {
        POST: {
          description: 'Crear una nueva solicitud de consignación',
          required_fields: ['owner_name', 'owner_phone', 'brand', 'model', 'year'],
          optional_fields: ['owner_email', 'expected_price', 'notes'],
          notes: 'El campo "website" es un honeypot - déjelo vacío'
        },
        GET: {
          description: 'Consultar estado por teléfono o ver información del endpoint',
          params: {
            phone: 'Número de teléfono para buscar estado de consignación'
          }
        }
      }
    });

  } catch (error) {
    console.error('Error in consignment GET:', error);
    return NextResponse.json(
      { success: false, error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
