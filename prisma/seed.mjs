import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const now = Date.now()
const hoursAgo = hours => new Date(now - hours * 60 * 60 * 1000)

try {
  await prisma.shipment.upsert({
    where: { trackingNumber: 'EMS-2048-7319' },
    update: {},
    create: {
      trackingNumber: 'EMS-2048-7319',
      serviceType: 'EXPRESS_INTL',
      status: 'IN_TRANSIT',
      senderName: 'Demo Sender', senderAddress: '100 Harbor Way', senderCity: 'New York', senderCountry: 'United States',
      receiverName: 'Demo Receiver', receiverAddress: '10 Thames Street', receiverCity: 'London', receiverCountry: 'United Kingdom',
      weightKg: 2.4,
      estimatedDelivery: new Date(now + 2 * 24 * 60 * 60 * 1000),
      senderLatitude: 40.6413, senderLongitude: -73.7781,
      receiverLatitude: 51.5072, receiverLongitude: -0.1276,
      events: { create: [
        { status: 'LABEL_CREATED', location: 'New York, United States', facility: 'EMSXpress Booking', description: 'Shipment details received.', timestamp: hoursAgo(48), latitude: 40.7128, longitude: -74.006 },
        { status: 'COLLECTED', location: 'Brooklyn, New York', facility: 'Brooklyn Service Center', description: 'Shipment collected from sender.', timestamp: hoursAgo(40), latitude: 40.686, longitude: -73.979 },
        { status: 'ORIGIN_GATEWAY', location: 'JFK International Airport', facility: 'New York Gateway', description: 'Sorted, manifested, and loaded for departure.', timestamp: hoursAgo(32), latitude: 40.6413, longitude: -73.7781 },
        { status: 'IN_TRANSIT', location: 'North Atlantic', facility: 'Flight EMS 204', description: 'Shipment is airborne to London.', timestamp: hoursAgo(18), latitude: 48, longitude: -30 },
      ] },
    },
  })
  console.log('Seeded demo shipment EMS-2048-7319')
} finally {
  await prisma.$disconnect()
}
