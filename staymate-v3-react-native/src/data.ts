export const GUESTS=[
{
  id: 1,
  name: 'Rohan Sharma',
  room: '204',
  type: 'Aadhaar',
  idNum: '4821 9012 3456',
  phone: '+91 98765 43210',
  email: 'rohan.sharma@email.com',
  nat: 'Indian',
  gender: 'Male',
  dob: '1995-04-12',
  address: '14 MG Road, Guwahati, Assam 781001',
  checkIn: '20 Aug 2026, 09:42 AM',
  checkOut: '23 Aug 2026, 11:00 AM',
  time: '9:42 AM',
  verified: true,
  roomType: 'Deluxe',
  frontPhotoUri: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
  backPhotoUri: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80',
  selfieUri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  photoUri: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
  additionalGuests: [
    { name: 'Kavita Sharma', relation: 'Spouse', idType: 'Aadhaar', idNumber: '9012 3344 5566' }
  ]
},
{
  id: 2,
  name: 'Priya Nair',
  room: '108',
  type: 'Passport',
  idNum: 'K9182374',
  phone: '+91 90123 44556',
  email: 'priya.nair@email.com',
  nat: 'Indian',
  gender: 'Female',
  dob: '1998-08-23',
  address: '22 Lake View, Kochi, Kerala 682001',
  checkIn: '21 Aug 2026, 08:15 AM',
  checkOut: '24 Aug 2026, 11:00 AM',
  time: '8:15 AM',
  verified: true,
  roomType: 'Suite',
  frontPhotoUri: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
  backPhotoUri: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80',
  selfieUri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
  photoUri: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
  additionalGuests: []
},
{
  id: 3,
  name: 'Arjun Verma',
  room: '301',
  type: 'Driving Licence',
  idNum: 'AS01 2018004921',
  phone: '+91 99887 65432',
  email: 'arjun.v@email.com',
  nat: 'Indian',
  gender: 'Male',
  dob: '1991-11-05',
  address: '7 Hilltop Colony, Shillong, Meghalaya',
  checkIn: '21 Aug 2026, 02:30 PM',
  checkOut: '22 Aug 2026, 11:00 AM',
  time: 'Yesterday',
  verified: false,
  roomType: 'Standard',
  frontPhotoUri: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
  backPhotoUri: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80',
  selfieUri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
  photoUri: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
  additionalGuests: []
}
];

export const ROOMS=[
{num:'101',type:'Standard',price:1800,status:'available'}, {num:'102',type:'Standard',price:1800,status:'occupied'}, {num:'108',type:'Suite',price:4200,status:'occupied'}, {num:'204',type:'Deluxe',price:2600,status:'occupied'}, {num:'205',type:'Deluxe',price:2600,status:'cleaning'}, {num:'301',type:'Standard',price:1900,status:'occupied'}, {num:'302',type:'Cottage',price:3600,status:'maintenance'}, {num:'303',type:'Cottage',price:3600,status:'available'}
] as const;

export type RoomStatus=(typeof ROOMS)[number]['status'];

export const STATUS_META={available:{label:'Available',color:'#0B8F68',bg:'#ECFDF5'},occupied:{label:'Occupied',color:'#7C3AED',bg:'#F3E8FF'},cleaning:{label:'Cleaning',color:'#B86A00',bg:'#FFF6E8'},maintenance:{label:'Maintenance',color:'#C73745',bg:'#FFF0F2'}} as const;

export const PLANS=[{name:'Free',priceM:0,priceY:0,rooms:'2 rooms',checkins:'15 check-ins / mo',exports:'3 reports & exports / mo',ocr:false,cloud:false,tag:''},{name:'Starter',priceM:349,priceY:3499,rooms:'8 rooms',checkins:'100 check-ins / mo',exports:'10 reports & exports / mo',ocr:true,cloud:false,tag:''},{name:'Professional',priceM:799,priceY:7999,rooms:'25 rooms',checkins:'Unlimited check-ins',exports:'Unlimited reports & exports',ocr:true,cloud:true,tag:'Most popular'},{name:'Multi-Property',priceM:1799,priceY:17999,rooms:'Unlimited rooms · 5 properties',checkins:'Unlimited check-ins',exports:'Unlimited reports & exports',ocr:true,cloud:true,tag:''},{name:'Enterprise',priceM:null,priceY:null,rooms:'Unlimited everything',checkins:'Dedicated support',exports:'Unlimited reports & exports',ocr:true,cloud:true,tag:''}] as const;

export function buildSelfCheckinLink(propertyId = 'HS-4821', propertyName = 'StayMate Homestay', availableRooms?: any[]) {
  const propId = encodeURIComponent(propertyId);
  const ownerId = 'OWNER_DEFAULT_101';
  const propName = encodeURIComponent(propertyName);
  
  let roomsQuery = '';
  if (availableRooms && availableRooms.length > 0) {
    const encoded = availableRooms.map(r => `${encodeURIComponent(r.num || r.room_number || '101')}:${encodeURIComponent(r.type || r.room_type || 'Standard')}:${r.price || 0}`).join(';');
    roomsQuery = `&rooms=${encodeURIComponent(encoded)}`;
  }
  return `https://staymate-co.vercel.app/self-checkin?property_id=${propId}&owner_id=${ownerId}&property_name=${propName}${roomsQuery}`;
}

export const SELF_CHECKIN_URL = buildSelfCheckinLink('HS-4821', 'StayMate Homestay', [
  { num: '101', type: 'Standard', price: 1800 },
  { num: '303', type: 'Cottage', price: 3600 }
]);

export const SELF_CHECKINS=[
  {
    id: 1,
    name: 'Rohan Sharma',
    room: '204',
    submitted: '2 min ago',
    doc: 'Aadhaar · 4821 9012 3456',
    idType: 'Aadhaar',
    idNum: '4821 9012 3456',
    phone: '+91 98765 43210',
    email: 'rohan.sharma@email.com',
    address: '14 MG Road, Guwahati, Assam 781001',
    dob: '1995-04-12',
    gender: 'Male',
    nationality: 'Indian',
    frontPhotoUri: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
    backPhotoUri: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80',
    selfieUri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    photoUri: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
    checkInDate: '2026-08-20',
    checkOutDate: '2026-08-23',
    additionalGuests: [
      { name: 'Kavita Sharma', relation: 'Spouse', idType: 'Aadhaar', idNumber: '9012 3344 5566' }
    ]
  },
  {
    id: 2,
    name: 'Priya Nair',
    room: '108',
    submitted: '11 min ago',
    doc: 'Passport · K9182374',
    idType: 'Passport',
    idNum: 'K9182374',
    phone: '+91 90123 44556',
    email: 'priya.nair@email.com',
    address: '22 Lake View, Kochi, Kerala 682001',
    dob: '1998-08-23',
    gender: 'Female',
    nationality: 'Indian',
    frontPhotoUri: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
    backPhotoUri: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80',
    selfieUri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
    photoUri: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
    checkInDate: '2026-08-21',
    checkOutDate: '2026-08-24',
    additionalGuests: []
  }
];
