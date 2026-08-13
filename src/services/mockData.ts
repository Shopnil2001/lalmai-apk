import AsyncStorage from '@react-native-async-storage/async-storage';

// Types definition matching Firestore Collections
export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  email?: string;
  role: 'Super Admin' | 'Admin' | 'General Member';
  status: 'pending' | 'active' | 'suspended';
  photoUrl: string | null;
  drivingLicense?: string;
  registrationNumber?: string;
  joinedAt: number;
  area?: string;
  assignedArea?: string;
  assignedAreas?: string[];
  permissions?: {
    viewDues: boolean;
    generateDues: boolean;
    manageMeetings: boolean;
    manageEvents: boolean;
    viewAttendance: boolean;
    takeAttendance: boolean;
    logPayment?: boolean;
    viewPayment?: boolean;
    editYearlyFee?: boolean;
    editUser?: boolean;
  };
  authProvider?: 'email' | 'google' | 'phone';
  profileComplete?: boolean;
  yearlyFee?: number;
  password?: string;
  isOwner?: boolean;
  carType?: 'none' | 'NOAH' | 'TRX' | 'Private Car';
  address?: string;
  originalEmail?: string;
}

export interface HomepageSettings {
  sliders: { imageUrl: string; text: string }[];
  gallery: string[];
  contactInfo: {
    phone: string;
    whatsapp: string;
    facebook: string;
  };
}

export interface Area {
  id: string;
  name: string;
  createdAt: number;
}


export interface Meeting {
  id: string;
  title: string;
  description: string;
  dateTime: number;
  location: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  createdBy: string;
  createdAt: number;
  targetAreas?: string[];
}

export interface Attendance {
  id: string; // meetingId_userId
  meetingId: string;
  userId: string;
  userName: string;
  status: 'present' | 'absent' | 'excused';
  markedBy: string;
  markedAt: number;
}

export interface EventAttendance {
  id: string; // eventId_userId
  eventId: string;
  userId: string;
  userName: string;
  status: 'present' | 'absent' | 'excused';
  markedBy: string;
  markedAt: number;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  dateTime: number;
  location: string;
  bannerUrl: string | null;
  bannerUrls?: string[];
  status: 'active' | 'cancelled' | 'completed';
  createdBy: string;
  createdAt: number;
  targetAreas?: string[];
}

export interface FeeRecord {
  id: string; // userId_year_month
  userId: string;
  userName: string;
  month: string; // "YYYY-MM"
  amount: number;
  status: 'paid' | 'unpaid' | 'pending';
  paidAt: number | null;
  receivedBy: string | null;
  createdAt: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  postedBy: string;
  postedByName: string;
  postedByRole: string;
  createdAt: number;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  imageUrls?: string[];
  postedBy: string;
  postedByName: string;
  createdAt: number;
  likesCount: number;
  likedBy: string[]; // List of user UIDs
}

export interface MemberAttendance {
  id: string; // userId_dateStr
  userId: string;
  dateStr: string; // YYYY-MM-DD
  markedBy: string;
  markedAt: number;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  amount: number;
  dateStr: string; // YYYY-MM-DD
  note?: string;
  markedBy: string;
  markedAt: number;
}

export interface OtherIncomeRecord {
  id: string;
  source: string;
  amount: number;
  dateStr: string; // YYYY-MM-DD
  note?: string;
  markedBy: string;
  createdAt: number;
}

export interface ExpenseRecord {
  id: string;
  description: string;
  amount: number;
  dateStr: string; // YYYY-MM-DD
  note?: string;
  markedBy: string;
  createdAt: number;
}

// Keys for Async Storage
const KEYS = {
  USERS: 'LRC_MOCK_USERS',
  MEETINGS: 'LRC_MOCK_MEETINGS',
  ATTENDANCE: 'LRC_MOCK_ATTENDANCE',
  EVENTS: 'LRC_MOCK_EVENTS',
  FEES: 'LRC_MOCK_FEES',
  ANNOUNCEMENTS: 'LRC_MOCK_ANNOUNCEMENTS',
  ACTIVITIES: 'LRC_MOCK_ACTIVITIES',
  EVENT_ATTENDANCE: 'LRC_MOCK_EVENT_ATTENDANCE',
  AREAS: 'LRC_MOCK_AREAS',
  PAYMENT_INSTRUCTIONS: 'LRC_MOCK_PAYMENT_INSTRUCTIONS',
  MEMBER_ATTENDANCE: 'LRC_MOCK_MEMBER_ATTENDANCE',
  PAYMENTS: 'LRC_MOCK_PAYMENTS',
  HOMEPAGE_SETTINGS: 'LRC_MOCK_HOMEPAGE_SETTINGS',
  OTHER_INCOME: 'LRC_MOCK_OTHER_INCOME',
  EXPENSES: 'LRC_MOCK_EXPENSES',
};

// Seed Data
const SEED_USERS: UserProfile[] = [
  {
    uid: 'admin_1',
    name: 'Kazi Nurul Alam',
    phone: '+8801711223344',
    email: 'admin@lrc.com',
    role: 'Super Admin',
    status: 'active',
    photoUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
    joinedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    isOwner: true,
    carType: 'none',
    address: 'Lalmai, Comilla',
    authProvider: 'phone',
  },
  {
    uid: 'president_1',
    name: 'Haji Mohammad Selim',
    phone: '+8801811223344',
    email: 'president@lrc.com',
    role: 'Admin',
    status: 'active',
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    joinedAt: Date.now() - 28 * 24 * 60 * 60 * 1000,
    assignedArea: 'বাগমারা (উত্তর)',
    carType: 'none',
    address: 'Lalmai, Comilla',
    authProvider: 'phone',
    permissions: {
      viewDues: true,
      generateDues: true,
      manageMeetings: true,
      manageEvents: true,
      viewAttendance: true,
      takeAttendance: true,
      editUser: true,
    }
  },
  {
    uid: 'treasurer_1',
    name: 'Rafiqul Islam',
    phone: '+8801911223344',
    email: 'treasurer@lrc.com',
    role: 'Admin',
    status: 'active',
    photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    joinedAt: Date.now() - 25 * 24 * 60 * 60 * 1000,
    assignedArea: 'বাগমারা (দক্ষিণ)',
    carType: 'none',
    address: 'Lalmai, Comilla',
    authProvider: 'phone',
    permissions: {
      viewDues: true,
      generateDues: true,
      manageMeetings: false,
      manageEvents: false,
      viewAttendance: false,
      takeAttendance: false,
      editUser: true,
    }
  },
  {
    uid: 'events_1',
    name: 'Farhan Kabir',
    phone: '+8801511223344',
    email: 'events@lrc.com',
    role: 'Admin',
    status: 'active',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    joinedAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
    assignedArea: 'ভূলইন (উত্তর)',
    carType: 'none',
    address: 'Lalmai, Comilla',
    authProvider: 'phone',
    permissions: {
      viewDues: false,
      generateDues: false,
      manageMeetings: true,
      manageEvents: true,
      viewAttendance: true,
      takeAttendance: true,
      editUser: true,
    }
  },
  {
    uid: 'driver_1',
    name: 'Abul Hossain',
    phone: '+8801611223344',
    email: 'driver@lrc.com',
    role: 'General Member',
    status: 'active',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    drivingLicense: 'DL-8837192A',
    registrationNumber: 'Dhaka Metro-G-11-2233',
    joinedAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
    area: 'বাগমারা (উত্তর)',
    yearlyFee: 1200,
    carType: 'NOAH',
    address: 'Bagmara, Lalmai',
    authProvider: 'phone',
  },
  {
    uid: 'driver_2',
    name: 'Belal Ahmed',
    phone: '+8801311223344',
    email: 'member2@lrc.com',
    role: 'General Member',
    status: 'pending',
    photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
    drivingLicense: 'DL-9948212B',
    registrationNumber: 'Dhaka Metro-Ga-44-5566',
    joinedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    area: 'বাগমারা (দক্ষিণ)',
    yearlyFee: 1200,
    carType: 'none',
    address: 'Bagmara, Lalmai',
    authProvider: 'phone',
  }
];

const SEED_AREAS: Area[] = [
  { id: 'area_1', name: 'বাগমারা (উত্তর)', createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000 },
  { id: 'area_2', name: 'বাগমারা (দক্ষিণ)', createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000 },
  { id: 'area_3', name: 'ভূলইন (উত্তর)', createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000 },
  { id: 'area_4', name: 'ভূলইন (দক্ষিণ)', createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000 },
  { id: 'area_5', name: 'বেলঘর (উত্তর)', createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000 },
  { id: 'area_6', name: 'বেলঘর (দক্ষিণ)', createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000 },
  { id: 'area_7', name: 'পেরুল (উত্তর)', createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000 },
  { id: 'area_8', name: 'পেরুল (দক্ষিণ)', createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000 },
  { id: 'area_9', name: 'বাকই (উত্তর)', createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000 }
];

const SEED_MEETINGS: Meeting[] = [
  {
    id: 'meet_1',
    title: 'Monthly General Assembly Meeting',
    description: 'Discussion on annual budget review, route allocations, and member concerns.',
    dateTime: Date.now() + 2 * 24 * 60 * 60 * 1000, // 2 days later
    location: 'Lalmai Upozila Rent A Car Association Hall, Comilla',
    status: 'upcoming',
    createdBy: 'president_1',
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'meet_2',
    title: 'Emergency Driver Safety Seminar',
    description: 'Mandatory meeting covering safety guidelines for highway driving and customer etiquette.',
    dateTime: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
    location: 'LRC Office, Paduar Bazar',
    status: 'completed',
    createdBy: 'admin_1',
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
  }
];

const SEED_ATTENDANCE: Attendance[] = [
  {
    id: 'meet_2_driver_1',
    meetingId: 'meet_2',
    userId: 'driver_1',
    userName: 'Abul Hossain',
    status: 'present',
    markedBy: 'admin_1',
    markedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'meet_2_treasurer_1',
    meetingId: 'meet_2',
    userId: 'treasurer_1',
    userName: 'Rafiqul Islam',
    status: 'present',
    markedBy: 'admin_1',
    markedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
  }
];

const SEED_EVENTS: Event[] = [
  {
    id: 'event_1',
    title: 'LRC Annual Family Picnic 2026',
    description: 'Join us for our annual picnic celebration at Shalban Vihara. Refreshments, sports, and cultural events are planned.',
    dateTime: Date.now() + 10 * 24 * 60 * 60 * 1000, // 10 days later
    location: 'Shalban Vihara Picnic Spot, Comilla',
    bannerUrl: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=600',
    status: 'active',
    createdBy: 'events_1',
    createdAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'event_2',
    title: 'Highway Road Awareness Campaign',
    description: 'Safety awareness event on Comilla-Dhaka highway with local traffic authorities.',
    dateTime: Date.now() - 15 * 24 * 60 * 60 * 1000,
    location: 'Main Highway Gate, Comilla',
    bannerUrl: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=600',
    status: 'completed',
    createdBy: 'admin_1',
    createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
  }
];

const SEED_FEES: FeeRecord[] = [
  // Driver 1 Fees
  {
    id: 'driver_1_2026_05',
    userId: 'driver_1',
    userName: 'Abul Hossain',
    month: '2026-05',
    amount: 1000,
    status: 'paid',
    paidAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
    receivedBy: 'treasurer_1',
    createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'driver_1_2026_06',
    userId: 'driver_1',
    userName: 'Abul Hossain',
    month: '2026-06',
    amount: 1000,
    status: 'unpaid',
    paidAt: null,
    receivedBy: null,
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
  },
  // Driver 2 Fees
  {
    id: 'driver_2_2026_06',
    userId: 'driver_2',
    userName: 'Belal Ahmed',
    month: '2026-06',
    amount: 1000,
    status: 'pending',
    paidAt: null,
    receivedBy: null,
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
  }
];

const SEED_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann_1',
    title: 'LRC Mobile Application Launched!',
    content: 'Welcome to the official Lalmai Upozila Rent A Car Mobile Application. We are proud to launch this central platform for managing our operations, meetings, and monthly fee collections. Please keep your profile information updated.',
    postedBy: 'admin_1',
    postedByName: 'Kazi Nurul Alam',
    postedByRole: 'Super Admin',
    createdAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'ann_2',
    title: 'Reminder: Monthly Fee Collection',
    content: 'Monthly fee of BDT 1,000 is due for June 2026. Please make your payments to the Treasurer, Rafiqul Islam, by the 15th of this month to avoid fines.',
    postedBy: 'treasurer_1',
    postedByName: 'Rafiqul Islam',
    postedByRole: 'Treasurer',
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
  }
];

const SEED_ACTIVITIES: Activity[] = [
  {
    id: 'act_1',
    title: 'LRC Car Fleet at Shalban',
    description: 'Our team successfully completed the tourist group rental trip from Dhaka to Shalban Vihara, Comilla today. Outstanding feedback from customers!',
    imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600',
    postedBy: 'admin_1',
    postedByName: 'Kazi Nurul Alam',
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    likesCount: 5,
    likedBy: ['president_1', 'treasurer_1', 'driver_1'],
  },
  {
    id: 'act_2',
    title: 'Brand New Sedan Added!',
    description: 'Congratulations to Haji Mohammad Selim for adding a brand new Toyota Axio to the LRC premium fleet. Looking forward to more successful rentals.',
    imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600',
    postedBy: 'president_1',
    postedByName: 'Haji Mohammad Selim',
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    likesCount: 8,
    likedBy: ['admin_1', 'treasurer_1', 'driver_1', 'events_1'],
  }
];

const SEED_OTHER_INCOME: OtherIncomeRecord[] = [
  {
    id: 'inc_1',
    source: 'Lalmai Hotel Rent',
    amount: 15000,
    dateStr: '2026-06-10',
    note: 'Monthly rental collection from hotel block',
    markedBy: 'admin_1',
    createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'inc_2',
    source: 'Donation from VIP Patron',
    amount: 5000,
    dateStr: '2026-06-15',
    note: 'General donation for association picnic',
    markedBy: 'treasurer_1',
    createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'inc_3',
    source: 'Lalmai Hotel Cafe Share',
    amount: 8000,
    dateStr: '2026-05-28',
    note: 'May revenue share',
    markedBy: 'treasurer_1',
    createdAt: Date.now() - 32 * 24 * 60 * 60 * 1000,
  }
];

const SEED_EXPENSES: ExpenseRecord[] = [
  {
    id: 'exp_1',
    description: 'Office Fan Repair',
    amount: 1200,
    dateStr: '2026-06-12',
    note: 'Repaired 2 ceiling fans in main hall',
    markedBy: 'treasurer_1',
    createdAt: Date.now() - 18 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'exp_2',
    description: 'Picnic Banner & Printing',
    amount: 2500,
    dateStr: '2026-06-18',
    note: 'Printed 3 large banners for Shalban picnic',
    markedBy: 'admin_1',
    createdAt: Date.now() - 12 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'exp_3',
    description: 'Monthly Office Electricity Bill',
    amount: 3400,
    dateStr: '2026-05-30',
    note: 'May electricity dues settled',
    markedBy: 'treasurer_1',
    createdAt: Date.now() - 31 * 24 * 60 * 60 * 1000,
  }
];

// Helper to write to storage or memory
class LocalDB {
  private memoryCache: { [key: string]: any } = {};

  async get<T>(key: string, seed: T): Promise<T> {
    try {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
      // Seed first time
      await this.set(key, seed);
      return seed;
    } catch {
      if (!this.memoryCache[key]) {
        this.memoryCache[key] = seed;
      }
      return this.memoryCache[key];
    }
  }

  async set(key: string, value: any): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {
      // noop
    }
    this.memoryCache[key] = value;
  }
}

const db = new LocalDB();

export const mockDB = {
  // USERS
  getUsers: () => db.get<UserProfile[]>(KEYS.USERS, SEED_USERS),
  saveUser: async (user: UserProfile) => {
    const users = await mockDB.getUsers();
    const index = users.findIndex(u => u.uid === user.uid);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    await db.set(KEYS.USERS, users);
    return user;
  },
  updateUserRole: async (uid: string, role: UserProfile['role']) => {
    const users = await mockDB.getUsers();
    const index = users.findIndex(u => u.uid === uid);
    if (index >= 0) {
      users[index].role = role;
      await db.set(KEYS.USERS, users);
      return users[index];
    }
    throw new Error('User not found');
  },
  verifyUser: async (uid: string, status: UserProfile['status']) => {
    const users = await mockDB.getUsers();
    const index = users.findIndex(u => u.uid === uid);
    if (index >= 0) {
      users[index].status = status;
      await db.set(KEYS.USERS, users);
      return users[index];
    }
    throw new Error('User not found');
  },
  adminUpdateUser: async (uid: string, updates: Partial<UserProfile>) => {
    const users = await mockDB.getUsers();
    const index = users.findIndex(u => u.uid === uid);
    if (index >= 0) {
      users[index] = { ...users[index], ...updates };
      await db.set(KEYS.USERS, users);
      return users[index];
    }
    throw new Error('User not found');
  },
  
  // AREAS
  getAreas: () => db.get<Area[]>(KEYS.AREAS, SEED_AREAS),
  createArea: async (name: string) => {
    const areas = await mockDB.getAreas();
    const newArea: Area = {
      id: 'area_' + Math.random().toString(36).substring(2, 9),
      name,
      createdAt: Date.now(),
    };
    areas.push(newArea);
    await db.set(KEYS.AREAS, areas);
    return newArea;
  },
  deleteArea: async (id: string) => {
    const areas = await mockDB.getAreas();
    const filtered = areas.filter(a => a.id !== id);
    await db.set(KEYS.AREAS, filtered);
  },

  // MEETINGS
  getMeetings: () => db.get<Meeting[]>(KEYS.MEETINGS, SEED_MEETINGS),
  createMeeting: async (meeting: Omit<Meeting, 'id' | 'createdAt'>) => {
    const meetings = await mockDB.getMeetings();
    const newMeeting: Meeting = {
      ...meeting,
      id: 'meet_' + Math.random().toString(36).substring(2, 9),
      createdAt: Date.now(),
    };
    meetings.push(newMeeting);
    // Sort upcoming first
    meetings.sort((a, b) => b.dateTime - a.dateTime);
    await db.set(KEYS.MEETINGS, meetings);
    return newMeeting;
  },
  updateMeeting: async (meeting: Meeting) => {
    const meetings = await mockDB.getMeetings();
    const index = meetings.findIndex(m => m.id === meeting.id);
    if (index >= 0) {
      meetings[index] = meeting;
      await db.set(KEYS.MEETINGS, meetings);
      return meeting;
    }
    throw new Error('Meeting not found');
  },
  deleteMeeting: async (id: string) => {
    const meetings = await mockDB.getMeetings();
    const filtered = meetings.filter(m => m.id !== id);
    await db.set(KEYS.MEETINGS, filtered);
  },

  // ATTENDANCE
  getAttendance: () => db.get<Attendance[]>(KEYS.ATTENDANCE, SEED_ATTENDANCE),
  getAttendanceForMeeting: async (meetingId: string) => {
    const records = await mockDB.getAttendance();
    return records.filter(r => r.meetingId === meetingId);
  },
  saveAttendance: async (meetingId: string, list: { userId: string; userName: string; status: Attendance['status'] }[], markedBy: string) => {
    const records = await mockDB.getAttendance();
    const now = Date.now();
    
    list.forEach(item => {
      const id = `${meetingId}_${item.userId}`;
      const recordIndex = records.findIndex(r => r.id === id);
      const data: Attendance = {
        id,
        meetingId,
        userId: item.userId,
        userName: item.userName,
        status: item.status,
        markedBy,
        markedAt: now,
      };

      if (recordIndex >= 0) {
        records[recordIndex] = data;
      } else {
        records.push(data);
      }
    });

    await db.set(KEYS.ATTENDANCE, records);
    return records.filter(r => r.meetingId === meetingId);
  },

  // EVENTS
  getEvents: () => db.get<Event[]>(KEYS.EVENTS, SEED_EVENTS),
  createEvent: async (event: Omit<Event, 'id' | 'createdAt'>) => {
    const events = await mockDB.getEvents();
    const newEvent: Event = {
      ...event,
      id: 'event_' + Math.random().toString(36).substring(2, 9),
      createdAt: Date.now(),
    };
    events.push(newEvent);
    events.sort((a, b) => b.dateTime - a.dateTime);
    await db.set(KEYS.EVENTS, events);
    return newEvent;
  },
  updateEvent: async (event: Event) => {
    const events = await mockDB.getEvents();
    const index = events.findIndex(e => e.id === event.id);
    if (index >= 0) {
      events[index] = event;
      await db.set(KEYS.EVENTS, events);
      return event;
    }
    throw new Error('Event not found');
  },
  deleteEvent: async (id: string) => {
    const events = await mockDB.getEvents();
    const filtered = events.filter(e => e.id !== id);
    await db.set(KEYS.EVENTS, filtered);
  },

  // EVENT ATTENDANCE
  getEventAttendance: () => db.get<EventAttendance[]>(KEYS.EVENT_ATTENDANCE, []),
  getAttendanceForEvent: async (eventId: string) => {
    const records = await mockDB.getEventAttendance();
    return records.filter(r => r.eventId === eventId);
  },
  saveEventAttendance: async (eventId: string, list: { userId: string; userName: string; status: EventAttendance['status'] }[], markedBy: string) => {
    const records = await mockDB.getEventAttendance();
    const now = Date.now();
    
    list.forEach(item => {
      const id = `${eventId}_${item.userId}`;
      const recordIndex = records.findIndex(r => r.id === id);
      const data: EventAttendance = {
        id,
        eventId,
        userId: item.userId,
        userName: item.userName,
        status: item.status,
        markedBy,
        markedAt: now,
      };

      if (recordIndex >= 0) {
        records[recordIndex] = data;
      } else {
        records.push(data);
      }
    });

    await db.set(KEYS.EVENT_ATTENDANCE, records);
    return records.filter(r => r.eventId === eventId);
  },

  // FEES
  getFees: () => db.get<FeeRecord[]>(KEYS.FEES, SEED_FEES),
  updateFeeStatus: async (feeId: string, status: FeeRecord['status'], receivedBy: string | null) => {
    const records = await mockDB.getFees();
    const index = records.findIndex(r => r.id === feeId);
    if (index >= 0) {
      records[index].status = status;
      records[index].paidAt = status === 'paid' ? Date.now() : null;
      records[index].receivedBy = status === 'paid' ? receivedBy : null;
      await db.set(KEYS.FEES, records);
      return records[index];
    }
    throw new Error('Fee record not found');
  },
  generateMonthlyFees: async (month: string, amount: number, areaName?: string) => {
    // Generate records for all active General Members
    const users = await mockDB.getUsers();
    const records = await mockDB.getFees();
    const drivers = users.filter(u => u.role === 'General Member' && u.status === 'active' && (!areaName || u.area === areaName));
    
    let addedCount = 0;
    drivers.forEach(driver => {
      const id = `${driver.uid}_${month.replace('-', '_')}`;
      const exists = records.some(r => r.id === id);
      if (!exists) {
        records.push({
          id,
          userId: driver.uid,
          userName: driver.name,
          month,
          amount: driver.yearlyFee ?? amount,
          status: 'unpaid',
          paidAt: null,
          receivedBy: null,
          createdAt: Date.now(),
        });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      await db.set(KEYS.FEES, records);
    }
    return records;
  },
  deleteFeesForYear: async (year: string) => {
    const records = await mockDB.getFees();
    const prefix = `${year}-`;
    const filtered = records.filter(r => !r.month.startsWith(prefix));
    await db.set(KEYS.FEES, filtered);
    return filtered;
  },
  deleteFee: async (feeId: string) => {
    const records = await mockDB.getFees();
    const filtered = records.filter(r => r.id !== feeId);
    await db.set(KEYS.FEES, filtered);
    return filtered;
  },
  updateFeeAmount: async (feeId: string, amount: number) => {
    const records = await mockDB.getFees();
    const index = records.findIndex(r => r.id === feeId);
    if (index >= 0) {
      records[index].amount = amount;
      await db.set(KEYS.FEES, records);
      return records[index];
    }
    throw new Error('Fee record not found');
  },
  deleteFeesForMonth: async (month: string) => {
    const records = await mockDB.getFees();
    const filtered = records.filter(r => r.month !== month);
    await db.set(KEYS.FEES, filtered);
    return filtered;
  },
  getPaymentInstructions: () => db.get<string>(KEYS.PAYMENT_INSTRUCTIONS, 'Please pay your outstanding dues directly to our association Treasurer:\n\nRafiqul Islam (Treasurer)\nPhone: +880 1911-223344\n\nAfter paying, the Treasurer will update your status in the system.'),
  updatePaymentInstructions: async (instructions: string) => {
    await db.set(KEYS.PAYMENT_INSTRUCTIONS, instructions);
    return instructions;
  },

  // ANNOUNCEMENTS
  getAnnouncements: () => db.get<Announcement[]>(KEYS.ANNOUNCEMENTS, SEED_ANNOUNCEMENTS),
  createAnnouncement: async (ann: Omit<Announcement, 'id' | 'createdAt'>) => {
    const announcements = await mockDB.getAnnouncements();
    const newAnn: Announcement = {
      ...ann,
      id: 'ann_' + Math.random().toString(36).substring(2, 9),
      createdAt: Date.now(),
    };
    announcements.push(newAnn);
    announcements.sort((a, b) => b.createdAt - a.createdAt);
    await db.set(KEYS.ANNOUNCEMENTS, announcements);
    return newAnn;
  },

  // ACTIVITIES
  getActivities: () => db.get<Activity[]>(KEYS.ACTIVITIES, SEED_ACTIVITIES),
  createActivity: async (act: Omit<Activity, 'id' | 'createdAt' | 'likesCount' | 'likedBy'>) => {
    const activities = await mockDB.getActivities();
    const newAct: Activity = {
      ...act,
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      createdAt: Date.now(),
      likesCount: 0,
      likedBy: [],
    };
    activities.push(newAct);
    activities.sort((a, b) => b.createdAt - a.createdAt);
    await db.set(KEYS.ACTIVITIES, activities);
    return newAct;
  },
  likeActivity: async (activityId: string, userId: string) => {
    const activities = await mockDB.getActivities();
    const index = activities.findIndex(a => a.id === activityId);
    if (index >= 0) {
      const activity = activities[index];
      if (!activity.likedBy) activity.likedBy = [];
      
      const userIndex = activity.likedBy.indexOf(userId);
      if (userIndex >= 0) {
        // Unlike
        activity.likedBy.splice(userIndex, 1);
      } else {
        // Like
        activity.likedBy.push(userId);
      }
      activity.likesCount = activity.likedBy.length;
      activities[index] = activity;
      await db.set(KEYS.ACTIVITIES, activities);
      return activity;
    }
    throw new Error('Activity not found');
  },
  updateActivity: async (activity: Activity) => {
    const activities = await mockDB.getActivities();
    const index = activities.findIndex(a => a.id === activity.id);
    if (index >= 0) {
      activities[index] = activity;
      await db.set(KEYS.ACTIVITIES, activities);
      return activity;
    }
    throw new Error('Activity not found');
  },
  deleteActivity: async (id: string) => {
    const activities = await mockDB.getActivities();
    const filtered = activities.filter(a => a.id !== id);
    await db.set(KEYS.ACTIVITIES, filtered);
  },

  // MEMBER ATTENDANCE
  getMemberAttendance: (userId: string) => db.get<MemberAttendance[]>(KEYS.MEMBER_ATTENDANCE, []),
  toggleMemberAttendance: async (userId: string, dateStr: string, adminId: string) => {
    const key = `${userId}_${dateStr}`;
    const allRecords = await db.get<MemberAttendance[]>(KEYS.MEMBER_ATTENDANCE, []);
    const index = allRecords.findIndex(r => r.id === key);
    if (index >= 0) {
      const updatedAll = allRecords.filter(r => r.id !== key);
      await db.set(KEYS.MEMBER_ATTENDANCE, updatedAll);
      return false;
    } else {
      const newRecord: MemberAttendance = {
        id: key,
        userId,
        dateStr,
        markedBy: adminId,
        markedAt: Date.now(),
      };
      allRecords.push(newRecord);
      await db.set(KEYS.MEMBER_ATTENDANCE, allRecords);
      return true;
    }
  },
  markMemberPresent: async (userId: string, dateStr: string, adminId: string) => {
    const key = `${userId}_${dateStr}`;
    const allRecords = await db.get<MemberAttendance[]>(KEYS.MEMBER_ATTENDANCE, []);
    const exists = allRecords.some(r => r.id === key);
    if (!exists) {
      const newRecord: MemberAttendance = {
        id: key,
        userId,
        dateStr,
        markedBy: adminId,
        markedAt: Date.now(),
      };
      allRecords.push(newRecord);
      await db.set(KEYS.MEMBER_ATTENDANCE, allRecords);
    }
  },

  // PAYMENTS
  getPayments: () => db.get<PaymentRecord[]>(KEYS.PAYMENTS, []),
  getMemberPayments: async (userId: string) => {
    const allPayments = await mockDB.getPayments();
    return allPayments.filter(p => p.userId === userId);
  },
  recordMemberPayment: async (userId: string, amount: number, dateStr: string, note: string | undefined, adminId: string) => {
    const allPayments = await mockDB.getPayments();
    const newPayment: PaymentRecord = {
      id: 'pay_' + Math.random().toString(36).substring(2, 9),
      userId,
      amount,
      dateStr,
      note,
      markedBy: adminId,
      markedAt: Date.now(),
    };
    allPayments.push(newPayment);
    await db.set(KEYS.PAYMENTS, allPayments);
    return newPayment;
  },

  // USER CREATION BY ADMIN
  createUserByAdmin: async (profile: Omit<UserProfile, 'uid' | 'joinedAt'>, password?: string) => {
    const users = await mockDB.getUsers();
    const cleanNewPhone = profile.phone.replace(/\D/g, '');
    if (users.some(u => u.phone && u.phone.replace(/\D/g, '') === cleanNewPhone)) {
      throw new Error('Phone number is already registered.');
    }
    if (profile.email) {
      const emailLower = profile.email.toLowerCase();
      if (users.some(u => u.email && u.email.toLowerCase() === emailLower)) {
        throw new Error('Email is already in use.');
      }
    }
    const newUid = 'user_' + Math.random().toString(36).substring(2, 9);
    const newUser: UserProfile = {
      ...profile,
      uid: newUid,
      joinedAt: Date.now(),
      status: profile.status || 'active',
      profileComplete: true,
    };
    users.push(newUser);
    await db.set(KEYS.USERS, users);
    return newUser;
  },

  deleteUser: async (uid: string) => {
    const users = await mockDB.getUsers();
    // Protect Owner from deletion
    const targetUser = users.find(u => u.uid === uid);
    if (targetUser && targetUser.isOwner) {
      throw new Error('Owner account cannot be deleted.');
    }
    const updatedUsers = users.filter(u => u.uid !== uid);
    await db.set(KEYS.USERS, updatedUsers);

    const payments = await mockDB.getPayments();
    const updatedPayments = payments.filter(p => p.userId !== uid);
    await db.set(KEYS.PAYMENTS, updatedPayments);

    const attendance = await db.get<MemberAttendance[]>(KEYS.MEMBER_ATTENDANCE, []);
    const updatedAttendance = attendance.filter(a => a.userId !== uid);
    await db.set(KEYS.MEMBER_ATTENDANCE, updatedAttendance);
  },

  // HOMEPAGE SETTINGS
  getHomepageSettings: async (): Promise<HomepageSettings> => {
    const defaultSettings: HomepageSettings = {
      sliders: [
        {
          imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800',
          text: 'Welcome to Lalmai Upozila Rent A Car - Your Trusted Transport Partner'
        },
        {
          imageUrl: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800',
          text: 'Join our community of professional drivers and members'
        },
        {
          imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800',
          text: 'Safe, reliable, and premium rent-a-car services in Lalmai'
        }
      ],
      gallery: [
        'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400',
        'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=400',
        'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400',
        'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400'
      ],
      contactInfo: {
        phone: '+8801711223344',
        whatsapp: '+8801711223344',
        facebook: 'https://facebook.com/lalmairentcar'
      }
    };
    return db.get<HomepageSettings>(KEYS.HOMEPAGE_SETTINGS, defaultSettings);
  },

  updateHomepageSettings: async (settings: HomepageSettings): Promise<void> => {
    await db.set(KEYS.HOMEPAGE_SETTINGS, settings);
  },

  // OTHER INCOME
  getOtherIncome: () => db.get<OtherIncomeRecord[]>(KEYS.OTHER_INCOME, SEED_OTHER_INCOME),
  saveOtherIncome: async (record: OtherIncomeRecord) => {
    const list = await mockDB.getOtherIncome();
    const index = list.findIndex(r => r.id === record.id);
    if (index >= 0) {
      list[index] = record;
    } else {
      list.push(record);
    }
    await db.set(KEYS.OTHER_INCOME, list);
    return record;
  },
  deleteOtherIncome: async (id: string) => {
    const list = await mockDB.getOtherIncome();
    const filtered = list.filter(r => r.id !== id);
    await db.set(KEYS.OTHER_INCOME, filtered);
  },
  updateOtherIncome: async (id: string, updates: { source: string; amount: number; dateStr: string; note: string }) => {
    const list = await mockDB.getOtherIncome();
    const index = list.findIndex(r => r.id === id);
    if (index >= 0) {
      list[index] = { ...list[index], ...updates };
      await db.set(KEYS.OTHER_INCOME, list);
    }
  },

  // EXPENSES
  getExpenses: () => db.get<ExpenseRecord[]>(KEYS.EXPENSES, SEED_EXPENSES),
  saveExpense: async (record: ExpenseRecord) => {
    const list = await mockDB.getExpenses();
    const index = list.findIndex(r => r.id === record.id);
    if (index >= 0) {
      list[index] = record;
    } else {
      list.push(record);
    }
    await db.set(KEYS.EXPENSES, list);
    return record;
  },
  deleteExpense: async (id: string) => {
    const list = await mockDB.getExpenses();
    const filtered = list.filter(r => r.id !== id);
    await db.set(KEYS.EXPENSES, filtered);
  },
  updateExpense: async (id: string, updates: { description: string; amount: number; dateStr: string; note: string }) => {
    const list = await mockDB.getExpenses();
    const index = list.findIndex(r => r.id === id);
    if (index >= 0) {
      list[index] = { ...list[index], ...updates };
      await db.set(KEYS.EXPENSES, list);
    }
  }
};

export {
  SEED_USERS,
  SEED_MEETINGS,
  SEED_ATTENDANCE,
  SEED_EVENTS,
  SEED_FEES,
  SEED_ANNOUNCEMENTS,
  SEED_ACTIVITIES,
  SEED_AREAS,
  SEED_OTHER_INCOME,
  SEED_EXPENSES
};
