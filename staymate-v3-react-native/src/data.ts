export const GUESTS=[
{id:1,name:'Rohan Sharma',room:'204',type:'Aadhaar',idNum:'XXXX XXXX 4821',phone:'+91 98765 43210',email:'rohan.sharma@email.com',nat:'Indian',gender:'Male',address:'14 MG Road, Guwahati, Assam 781001',time:'9:42 AM',verified:true,roomType:'Deluxe'},
{id:2,name:'Priya Nair',room:'108',type:'Passport',idNum:'K91XXXXX',phone:'+91 90123 44556',email:'priya.nair@email.com',nat:'Indian',gender:'Female',address:'22 Lake View, Kochi, Kerala 682001',time:'8:15 AM',verified:true,roomType:'Suite'},
{id:3,name:'Arjun Verma',room:'301',type:'Driving Licence',idNum:'AS01 XXXXXXXXX',phone:'+91 99887 65432',email:'arjun.v@email.com',nat:'Indian',gender:'Male',address:'7 Hilltop Colony, Shillong, Meghalaya',time:'Yesterday',verified:false,roomType:'Standard'}
] as const;
export const ROOMS=[
{num:'101',type:'Standard',price:1800,status:'available'}, {num:'102',type:'Standard',price:1800,status:'occupied'}, {num:'108',type:'Suite',price:4200,status:'occupied'}, {num:'204',type:'Deluxe',price:2600,status:'occupied'}, {num:'205',type:'Deluxe',price:2600,status:'cleaning'}, {num:'301',type:'Standard',price:1900,status:'occupied'}, {num:'302',type:'Cottage',price:3600,status:'maintenance'}, {num:'303',type:'Cottage',price:3600,status:'available'}
] as const;
export type RoomStatus=(typeof ROOMS)[number]['status'];
export const STATUS_META={available:{label:'Available',color:'#0B8F68',bg:'#ECFDF5'},occupied:{label:'Occupied',color:'#7C3AED',bg:'#F3E8FF'},cleaning:{label:'Cleaning',color:'#B86A00',bg:'#FFF6E8'},maintenance:{label:'Maintenance',color:'#C73745',bg:'#FFF0F2'}} as const;
export const PLANS=[{name:'Free',priceM:0,priceY:0,rooms:'2 rooms',checkins:'15 check-ins / mo',ocr:false,tag:''},{name:'Starter',priceM:349,priceY:3499,rooms:'8 rooms',checkins:'100 check-ins / mo',ocr:true,tag:''},{name:'Professional',priceM:799,priceY:7999,rooms:'25 rooms',checkins:'Unlimited check-ins',ocr:true,tag:'Most popular'},{name:'Multi-Property',priceM:1799,priceY:17999,rooms:'Unlimited rooms · 5 properties',checkins:'Unlimited check-ins',ocr:true,tag:''},{name:'Enterprise',priceM:null,priceY:null,rooms:'Unlimited everything',checkins:'Dedicated support',ocr:true,tag:''}] as const;
export const SELF_CHECKIN_URL='https://staymate.app/checkin/HS-4821';
export const SELF_CHECKINS=[{id:1,name:'Rohan Sharma',room:'204',submitted:'2 min ago',doc:'Aadhaar · XXXX 4821',phone:'+91 98765 43210'},{id:2,name:'Priya Nair',room:'108',submitted:'11 min ago',doc:'Passport · P1234XXX',phone:'+91 98765 41022'}];
