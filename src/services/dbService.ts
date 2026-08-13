import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  getDoc 
} from 'firebase/firestore';
import { db, auth, hasRealFirebase } from './firebase';
import { 
  mockDB, 
  UserProfile, 
  Meeting, 
  Attendance, 
  Event, 
  FeeRecord, 
  Announcement, 
  Activity,
  EventAttendance,
  Area,
  SEED_USERS,
  SEED_MEETINGS,
  SEED_ATTENDANCE,
  SEED_EVENTS,
  SEED_FEES,
  SEED_ANNOUNCEMENTS,
  SEED_ACTIVITIES,
  MemberAttendance,
  PaymentRecord,
  HomepageSettings,
  OtherIncomeRecord,
  ExpenseRecord,
  SEED_OTHER_INCOME,
  SEED_EXPENSES
} from './mockData';

const cleanUndefined = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  const newObj: any = {};
  Object.keys(obj).forEach(key => {
    const val = obj[key];
    if (val !== undefined) {
      newObj[key] = val;
    }
  });
  return newObj;
};

export const dbService = {
  // USERS
  getUsers: async (): Promise<UserProfile[]> => {
    if (hasRealFirebase && db) {
      const q = query(collection(db, 'users'), orderBy('joinedAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as UserProfile);
    } else {
      return mockDB.getUsers();
    }
  },

  updateUserRole: async (uid: string, role: UserProfile['role']): Promise<UserProfile> => {
    if (hasRealFirebase && db) {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { role });
      const refreshed = await getDoc(userRef);
      return refreshed.data() as UserProfile;
    } else {
      return mockDB.updateUserRole(uid, role);
    }
  },

  verifyUser: async (uid: string, status: UserProfile['status']): Promise<UserProfile> => {
    if (hasRealFirebase && db) {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { status });
      const refreshed = await getDoc(userRef);
      return refreshed.data() as UserProfile;
    } else {
      return mockDB.verifyUser(uid, status);
    }
  },

  adminUpdateUser: async (uid: string, updates: Partial<UserProfile>, callerUid?: string): Promise<UserProfile> => {
    const cleanUpdates: any = {};
    Object.keys(updates).forEach(key => {
      const val = (updates as any)[key];
      if (val !== undefined) {
        cleanUpdates[key] = val;
      }
    });

    if (hasRealFirebase && db) {
      const userRef = doc(db, 'users', uid);
      // Owner protection: cannot modify the owner's record unless the caller IS the owner
      const snap = await getDoc(userRef);
      let oldPhone = null;
      let oldEmail = '';
      if (snap.exists()) {
        const profile = snap.data() as UserProfile;
        oldPhone = profile.phone ? profile.phone.replace(/\D/g, '') : null;
        oldEmail = profile.email || '';
        if (profile.isOwner && callerUid !== uid) {
          throw new Error('Owner account cannot be modified by other admins.');
        }
      }
      
      if (cleanUpdates.phone !== undefined || cleanUpdates.email !== undefined) {
        try {
          const newPhone = cleanUpdates.phone !== undefined 
            ? (cleanUpdates.phone ? cleanUpdates.phone.replace(/\D/g, '') : null) 
            : oldPhone;
          const emailToMap = (cleanUpdates.email || oldEmail).toLowerCase();
          
          if (newPhone) {
            await setDoc(doc(db, 'phone_mappings', newPhone), { email: emailToMap, uid });
            if (oldPhone && oldPhone !== newPhone) {
              const { deleteDoc } = require('firebase/firestore');
              await deleteDoc(doc(db, 'phone_mappings', oldPhone));
            }
          } else if (oldPhone) {
            const { deleteDoc } = require('firebase/firestore');
            await deleteDoc(doc(db, 'phone_mappings', oldPhone));
          }
        } catch (mapErr) {
          console.error('[dbService.adminUpdateUser] Failed to update phone mapping:', mapErr);
        }
      }

      await updateDoc(userRef, cleanUpdates);
      const refreshed = await getDoc(userRef);
      return refreshed.data() as UserProfile;
    } else {
      return mockDB.adminUpdateUser(uid, cleanUpdates);
    }
  },

  // AREAS
  getAreas: async (): Promise<Area[]> => {
    if (hasRealFirebase && db) {
      const snapshot = await getDocs(collection(db, 'areas'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Area);
    } else {
      return mockDB.getAreas();
    }
  },

  createArea: async (name: string): Promise<Area> => {
    if (hasRealFirebase && db) {
      const data = { name, createdAt: Date.now() };
      const docRef = await addDoc(collection(db, 'areas'), data);
      return { id: docRef.id, ...data };
    } else {
      return mockDB.createArea(name);
    }
  },

  deleteArea: async (id: string): Promise<void> => {
    if (hasRealFirebase && db) {
      await deleteDoc(doc(db, 'areas', id));
    } else {
      await mockDB.deleteArea(id);
    }
  },

  // MEETINGS
  getMeetings: async (): Promise<Meeting[]> => {
    if (hasRealFirebase && db) {
      const q = query(collection(db, 'meetings'), orderBy('dateTime', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Meeting);
    } else {
      return mockDB.getMeetings();
    }
  },

  createMeeting: async (meeting: Omit<Meeting, 'id' | 'createdAt'>): Promise<Meeting> => {
    if (hasRealFirebase && db) {
      const data = cleanUndefined({
        ...meeting,
        createdAt: Date.now()
      });
      const docRef = await addDoc(collection(db, 'meetings'), data);
      return { id: docRef.id, ...data } as Meeting;
    } else {
      return mockDB.createMeeting(meeting);
    }
  },

  updateMeeting: async (meeting: Meeting): Promise<Meeting> => {
    const { id, ...data } = meeting;
    if (hasRealFirebase && db) {
      const docRef = doc(db, 'meetings', id);
      await setDoc(docRef, cleanUndefined(data), { merge: true });
      return meeting;
    } else {
      return mockDB.updateMeeting(meeting);
    }
  },

  deleteMeeting: async (id: string): Promise<void> => {
    if (hasRealFirebase && db) {
      await deleteDoc(doc(db, 'meetings', id));
    } else {
      await mockDB.deleteMeeting(id);
    }
  },

  // ATTENDANCE
  getAttendanceForMeeting: async (meetingId: string): Promise<Attendance[]> => {
    if (hasRealFirebase && db) {
      const q = query(collection(db, 'attendance'), where('meetingId', '==', meetingId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as Attendance);
    } else {
      return mockDB.getAttendanceForMeeting(meetingId);
    }
  },

  getUserAttendance: async (userId: string): Promise<Attendance[]> => {
    if (hasRealFirebase && db) {
      const q = query(collection(db, 'attendance'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as Attendance);
    } else {
      const records = await mockDB.getAttendance();
      return records.filter(r => r.userId === userId);
    }
  },

  saveAttendance: async (
    meetingId: string, 
    list: { userId: string; userName: string; status: Attendance['status'] }[], 
    markedBy: string
  ): Promise<Attendance[]> => {
    if (hasRealFirebase && db) {
      const now = Date.now();
      const promises = list.map(async item => {
        const docId = `${meetingId}_${item.userId}`;
        const docRef = doc(db!, 'attendance', docId);
        const data: Attendance = {
          id: docId,
          meetingId,
          userId: item.userId,
          userName: item.userName,
          status: item.status,
          markedBy,
          markedAt: now
        };
        await setDoc(docRef, data);
      });
      await Promise.all(promises);
      return dbService.getAttendanceForMeeting(meetingId);
    } else {
      return mockDB.saveAttendance(meetingId, list, markedBy);
    }
  },

  // EVENT ATTENDANCE
  getAttendanceForEvent: async (eventId: string): Promise<EventAttendance[]> => {
    if (hasRealFirebase && db) {
      const q = query(collection(db, 'event_attendance'), where('eventId', '==', eventId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as EventAttendance);
    } else {
      return mockDB.getAttendanceForEvent(eventId);
    }
  },

  saveEventAttendance: async (
    eventId: string,
    list: { userId: string; userName: string; status: EventAttendance['status'] }[],
    markedBy: string
  ): Promise<EventAttendance[]> => {
    if (hasRealFirebase && db) {
      const now = Date.now();
      const promises = list.map(async item => {
        const docId = `${eventId}_${item.userId}`;
        const docRef = doc(db!, 'event_attendance', docId);
        const data: EventAttendance = {
          id: docId,
          eventId,
          userId: item.userId,
          userName: item.userName,
          status: item.status,
          markedBy,
          markedAt: now
        };
        await setDoc(docRef, data);
      });
      await Promise.all(promises);
      return dbService.getAttendanceForEvent(eventId);
    } else {
      return mockDB.saveEventAttendance(eventId, list, markedBy);
    }
  },

  // EVENTS
  getEvents: async (): Promise<Event[]> => {
    if (hasRealFirebase && db) {
      const q = query(collection(db, 'events'), orderBy('dateTime', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Event);
    } else {
      return mockDB.getEvents();
    }
  },

  createEvent: async (event: Omit<Event, 'id' | 'createdAt'>): Promise<Event> => {
    if (hasRealFirebase && db) {
      const data = cleanUndefined({
        ...event,
        createdAt: Date.now()
      });
      const docRef = await addDoc(collection(db, 'events'), data);
      return { id: docRef.id, ...data } as Event;
    } else {
      return mockDB.createEvent(event);
    }
  },

  updateEvent: async (event: Event): Promise<Event> => {
    const { id, ...data } = event;
    if (hasRealFirebase && db) {
      const docRef = doc(db, 'events', id);
      await setDoc(docRef, cleanUndefined(data), { merge: true });
      return event;
    } else {
      return mockDB.updateEvent(event);
    }
  },

  deleteEvent: async (id: string): Promise<void> => {
    if (hasRealFirebase && db) {
      await deleteDoc(doc(db, 'events', id));
    } else {
      await mockDB.deleteEvent(id);
    }
  },

  // FEES
  getFees: async (): Promise<FeeRecord[]> => {
    if (hasRealFirebase && db) {
      const q = query(collection(db, 'fees'), orderBy('month', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as FeeRecord);
    } else {
      return mockDB.getFees();
    }
  },

  updateFeeStatus: async (feeId: string, status: FeeRecord['status'], receivedBy: string | null): Promise<FeeRecord> => {
    if (hasRealFirebase && db) {
      const feeRef = doc(db, 'fees', feeId);
      const updates = {
        status,
        paidAt: status === 'paid' ? Date.now() : null,
        receivedBy: status === 'paid' ? receivedBy : null
      };
      await updateDoc(feeRef, updates);
      const refreshed = await getDoc(feeRef);
      return refreshed.data() as FeeRecord;
    } else {
      return mockDB.updateFeeStatus(feeId, status, receivedBy);
    }
  },

  generateMonthlyFees: async (month: string, amount: number, areaName?: string): Promise<FeeRecord[]> => {
    if (hasRealFirebase && db) {
      // Fetch active General Members
      let usersQuery = query(collection(db, 'users'), where('role', '==', 'General Member'), where('status', '==', 'active'));
      if (areaName) {
        usersQuery = query(collection(db, 'users'), where('role', '==', 'General Member'), where('status', '==', 'active'), where('area', '==', areaName));
      }
      const usersSnapshot = await getDocs(usersQuery);
      const drivers = usersSnapshot.docs.map(doc => doc.data() as UserProfile);

      const promises = drivers.map(async driver => {
        const docId = `${driver.uid}_${month.replace('-', '_')}`;
        const docRef = doc(db!, 'fees', docId);
        
        // Double check existence
        const existsDoc = await getDoc(docRef);
        if (!existsDoc.exists()) {
          const newFeeRecord: FeeRecord = {
            id: docId,
            userId: driver.uid,
            userName: driver.name,
            month,
            amount: driver.yearlyFee ?? amount,
            status: 'unpaid',
            paidAt: null,
            receivedBy: null,
            createdAt: Date.now()
          };
          await setDoc(docRef, newFeeRecord);
        }
      });
      await Promise.all(promises);
      return dbService.getFees();
    } else {
      return mockDB.generateMonthlyFees(month, amount, areaName);
    }
  },

  deleteFeesForYear: async (year: string): Promise<FeeRecord[]> => {
    if (hasRealFirebase && db) {
      const prefix = `${year}-`;
      const q = query(collection(db, 'fees'), where('month', '>=', prefix), where('month', '<=', prefix + '\uf8ff'));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(async dDoc => {
        await deleteDoc(doc(db!, 'fees', dDoc.id));
      });
      await Promise.all(deletePromises);
      return dbService.getFees();
    } else {
      return mockDB.deleteFeesForYear(year);
    }
  },

  deleteFee: async (feeId: string): Promise<void> => {
    if (hasRealFirebase && db) {
      await deleteDoc(doc(db, 'fees', feeId));
    } else {
      await mockDB.deleteFee(feeId);
    }
  },

  updateFeeAmount: async (feeId: string, amount: number): Promise<FeeRecord> => {
    if (hasRealFirebase && db) {
      const feeRef = doc(db, 'fees', feeId);
      await updateDoc(feeRef, { amount });
      const refreshed = await getDoc(feeRef);
      return refreshed.data() as FeeRecord;
    } else {
      return mockDB.updateFeeAmount(feeId, amount);
    }
  },

  deleteFeesForMonth: async (month: string): Promise<FeeRecord[]> => {
    if (hasRealFirebase && db) {
      const q = query(collection(db, 'fees'), where('month', '==', month));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(async dDoc => {
        await deleteDoc(doc(db!, 'fees', dDoc.id));
      });
      await Promise.all(deletePromises);
      return dbService.getFees();
    } else {
      return mockDB.deleteFeesForMonth(month);
    }
  },

  getPaymentInstructions: async (): Promise<string> => {
    if (hasRealFirebase && db) {
      const docRef = doc(db, 'settings', 'fees');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().paymentInstructions || '';
      }
      return '';
    } else {
      return mockDB.getPaymentInstructions();
    }
  },

  updatePaymentInstructions: async (instructions: string): Promise<string> => {
    if (hasRealFirebase && db) {
      const docRef = doc(db, 'settings', 'fees');
      await setDoc(docRef, { paymentInstructions: instructions }, { merge: true });
      return instructions;
    } else {
      return mockDB.updatePaymentInstructions(instructions);
    }
  },

  getHomepageSettings: async (): Promise<HomepageSettings> => {
    if (hasRealFirebase && db) {
      const docRef = doc(db, 'settings', 'homepage');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as HomepageSettings;
        return data;
      }
      // Return default fallbacks
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
      return defaultSettings;
    } else {
      return mockDB.getHomepageSettings();
    }
  },

  updateHomepageSettings: async (settings: HomepageSettings): Promise<void> => {
    if (hasRealFirebase && db) {
      const docRef = doc(db, 'settings', 'homepage');
      await setDoc(docRef, settings, { merge: true });
    } else {
      await mockDB.updateHomepageSettings(settings);
    }
  },

  // ANNOUNCEMENTS
  getAnnouncements: async (): Promise<Announcement[]> => {
    if (hasRealFirebase && db) {
      const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Announcement);
    } else {
      return mockDB.getAnnouncements();
    }
  },

  createAnnouncement: async (ann: Omit<Announcement, 'id' | 'createdAt'>): Promise<Announcement> => {
    if (hasRealFirebase && db) {
      const data = {
        ...ann,
        createdAt: Date.now()
      };
      const docRef = await addDoc(collection(db, 'announcements'), data);
      return { id: docRef.id, ...data } as Announcement;
    } else {
      return mockDB.createAnnouncement(ann);
    }
  },

  // ACTIVITIES
  getActivities: async (): Promise<Activity[]> => {
    if (hasRealFirebase && db) {
      const q = query(collection(db, 'activities'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Activity);
    } else {
      return mockDB.getActivities();
    }
  },

  createActivity: async (act: Omit<Activity, 'id' | 'createdAt' | 'likesCount' | 'likedBy'>): Promise<Activity> => {
    if (hasRealFirebase && db) {
      const data = {
        ...act,
        createdAt: Date.now(),
        likesCount: 0,
        likedBy: []
      };
      const docRef = await addDoc(collection(db, 'activities'), data);
      return { id: docRef.id, ...data } as Activity;
    } else {
      return mockDB.createActivity(act);
    }
  },

  likeActivity: async (activityId: string, userId: string): Promise<Activity> => {
    if (hasRealFirebase && db) {
      const activityRef = doc(db, 'activities', activityId);
      const activitySnap = await getDoc(activityRef);
      if (activitySnap.exists()) {
        const activity = activitySnap.data() as Activity;
        const likedBy = activity.likedBy || [];
        const index = likedBy.indexOf(userId);
        
        if (index >= 0) {
          likedBy.splice(index, 1);
        } else {
          likedBy.push(userId);
        }
        const likesCount = likedBy.length;
        await updateDoc(activityRef, { likedBy, likesCount });
        return { ...activity, id: activityId, likedBy, likesCount } as Activity;
      }
      throw new Error('Activity not found');
    } else {
      return mockDB.likeActivity(activityId, userId);
    }
  },

  updateActivity: async (activity: Activity): Promise<Activity> => {
    const { id, ...data } = activity;
    if (hasRealFirebase && db) {
      const docRef = doc(db, 'activities', id);
      await setDoc(docRef, data, { merge: true });
      return activity;
    } else {
      return mockDB.updateActivity(activity);
    }
  },

  deleteActivity: async (id: string): Promise<void> => {
    if (hasRealFirebase && db) {
      await deleteDoc(doc(db, 'activities', id));
    } else {
      await mockDB.deleteActivity(id);
    }
  },

  // MEMBER ATTENDANCE
  getMemberAttendance: async (userId: string): Promise<MemberAttendance[]> => {
    if (hasRealFirebase && db) {
      const q = query(collection(db, 'member_attendance'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as MemberAttendance);
    } else {
      return mockDB.getMemberAttendance(userId);
    }
  },

  toggleMemberAttendance: async (userId: string, dateStr: string, adminId: string): Promise<boolean> => {
    if (hasRealFirebase && db) {
      const docId = `${userId}_${dateStr}`;
      const docRef = doc(db, 'member_attendance', docId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        await deleteDoc(docRef);
        return false;
      } else {
        const record: MemberAttendance = {
          id: docId,
          userId,
          dateStr,
          markedBy: adminId,
          markedAt: Date.now()
        };
        await setDoc(docRef, record);
        return true;
      }
    } else {
      return mockDB.toggleMemberAttendance(userId, dateStr, adminId);
    }
  },

  markMemberPresent: async (userId: string, dateStr: string, adminId: string): Promise<void> => {
    if (hasRealFirebase && db) {
      const docId = `${userId}_${dateStr}`;
      const docRef = doc(db, 'member_attendance', docId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        const record: MemberAttendance = {
          id: docId,
          userId,
          dateStr,
          markedBy: adminId,
          markedAt: Date.now()
        };
        await setDoc(docRef, record);
      }
    } else {
      await mockDB.markMemberPresent(userId, dateStr, adminId);
    }
  },

  // PAYMENTS
  getMemberPayments: async (userId: string): Promise<PaymentRecord[]> => {
    if (hasRealFirebase && db) {
      const q = query(collection(db, 'payments'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => doc.data() as PaymentRecord);
      list.sort((a, b) => b.dateStr.localeCompare(a.dateStr));
      return list;
    } else {
      return mockDB.getMemberPayments(userId);
    }
  },

  getPayments: async (): Promise<PaymentRecord[]> => {
    if (hasRealFirebase && db) {
      const q = query(collection(db, 'payments'), orderBy('dateStr', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as PaymentRecord);
    } else {
      return mockDB.getPayments();
    }
  },


  recordMemberPayment: async (userId: string, amount: number, dateStr: string, note: string | undefined, adminId: string): Promise<PaymentRecord> => {
    if (hasRealFirebase && db) {
      const docRef = doc(collection(db, 'payments'));
      const record: PaymentRecord = {
        id: docRef.id,
        userId,
        amount,
        dateStr,
        note: note || '',
        markedBy: adminId,
        markedAt: Date.now()
      };
      await setDoc(docRef, record);
      return record;
    } else {
      return mockDB.recordMemberPayment(userId, amount, dateStr, note, adminId);
    }
  },

  // ADMIN MEMBER REGISTRATION
  createUserByAdmin: async (profile: Omit<UserProfile, 'uid' | 'joinedAt'>, password?: string): Promise<UserProfile> => {
    const cleanPhone = profile.phone.replace(/\D/g, '').slice(-11);
    if (!cleanPhone) {
      throw new Error('A valid phone number is required.');
    }
    const derivedEmail = `${cleanPhone}@lrc.com`;
    const derivedPwd = `lrc_secure_otp_${cleanPhone.slice(-10)}_2026_salt`;

    if (hasRealFirebase && db) {
      const { getSecondaryAuth } = await import('./firebase');
      const { createUserWithEmailAndPassword, signOut } = await import('firebase/auth');
      
      const secAuth = getSecondaryAuth();
      if (!secAuth) {
        throw new Error('Secondary auth client is not initialized');
      }
      
      const cred = await createUserWithEmailAndPassword(secAuth, derivedEmail, derivedPwd);
      const uid = cred.user.uid;
      
      await signOut(secAuth);
      
      const userProfile: UserProfile = {
        ...profile,
        email: profile.email || derivedEmail,
        uid,
        joinedAt: Date.now(),
        status: profile.status || 'active',
        profileComplete: true,
        authProvider: 'phone',
        carType: profile.carType || 'none',
        address: profile.address || '',
      };
      
      await setDoc(doc(db, 'users', uid), cleanUndefined(userProfile));
      
      await setDoc(doc(db, 'phone_mappings', cleanPhone), { email: derivedEmail, uid });
      
      return userProfile;
    } else {
      const mockProfile = {
        ...profile,
        email: profile.email || derivedEmail,
        authProvider: 'phone' as const,
        carType: profile.carType || 'none',
        address: profile.address || '',
      };
      return mockDB.createUserByAdmin(mockProfile, password);
    }
  },

  deleteUser: async (uid: string): Promise<void> => {
    if (hasRealFirebase && db) {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const profile = userSnap.data() as UserProfile;
        if (profile.isOwner) {
          throw new Error('Owner account cannot be deleted.');
        }
      }
      await deleteDoc(userRef);

      const paymentsRef = collection(db, 'payments');
      const paymentsQuery = query(paymentsRef, where('userId', '==', uid));
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const paymentBatchPromises = paymentsSnapshot.docs.map(dDoc => deleteDoc(dDoc.ref));
      await Promise.all(paymentBatchPromises);

      const attendanceRef = collection(db, 'member_attendance');
      const attendanceQuery = query(attendanceRef, where('userId', '==', uid));
      const attendanceSnapshot = await getDocs(attendanceQuery);
      const attendanceBatchPromises = attendanceSnapshot.docs.map(dDoc => deleteDoc(dDoc.ref));
      await Promise.all(attendanceBatchPromises);
    } else {
      await mockDB.deleteUser(uid);
    }
  },

  // OTHER INCOME
  getOtherIncome: async (): Promise<OtherIncomeRecord[]> => {
    if (hasRealFirebase && db) {
      const q = query(collection(db, 'other_income'), orderBy('dateStr', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as OtherIncomeRecord);
    } else {
      return mockDB.getOtherIncome();
    }
  },

  recordOtherIncome: async (
    source: string, 
    amount: number, 
    dateStr: string, 
    note: string | undefined, 
    adminId: string
  ): Promise<OtherIncomeRecord> => {
    if (hasRealFirebase && db) {
      const docRef = doc(collection(db, 'other_income'));
      const record: OtherIncomeRecord = {
        id: docRef.id,
        source,
        amount,
        dateStr,
        note: note || '',
        markedBy: adminId,
        createdAt: Date.now()
      };
      await setDoc(docRef, record);
      return record;
    } else {
      const record: OtherIncomeRecord = {
        id: 'inc_' + Math.random().toString(36).substring(2, 9),
        source,
        amount,
        dateStr,
        note: note || '',
        markedBy: adminId,
        createdAt: Date.now()
      };
      return mockDB.saveOtherIncome(record);
    }
  },

  deleteOtherIncome: async (id: string): Promise<void> => {
    if (hasRealFirebase && db) {
      await deleteDoc(doc(db, 'other_income', id));
    } else {
      await mockDB.deleteOtherIncome(id);
    }
  },

  updateOtherIncome: async (id: string, updates: { source: string; amount: number; dateStr: string; note: string }): Promise<void> => {
    if (hasRealFirebase && db) {
      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'other_income', id), updates as any);
    } else {
      await mockDB.updateOtherIncome(id, updates);
    }
  },

  // EXPENSES
  getExpenses: async (): Promise<ExpenseRecord[]> => {
    if (hasRealFirebase && db) {
      const q = query(collection(db, 'expenses'), orderBy('dateStr', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ExpenseRecord);
    } else {
      return mockDB.getExpenses();
    }
  },

  recordExpense: async (
    description: string, 
    amount: number, 
    dateStr: string, 
    note: string | undefined, 
    adminId: string
  ): Promise<ExpenseRecord> => {
    if (hasRealFirebase && db) {
      const docRef = doc(collection(db, 'expenses'));
      const record: ExpenseRecord = {
        id: docRef.id,
        description,
        amount,
        dateStr,
        note: note || '',
        markedBy: adminId,
        createdAt: Date.now()
      };
      await setDoc(docRef, record);
      return record;
    } else {
      const record: ExpenseRecord = {
        id: 'exp_' + Math.random().toString(36).substring(2, 9),
        description,
        amount,
        dateStr,
        note: note || '',
        markedBy: adminId,
        createdAt: Date.now()
      };
      return mockDB.saveExpense(record);
    }
  },

  deleteExpense: async (id: string): Promise<void> => {
    if (hasRealFirebase && db) {
      await deleteDoc(doc(db, 'expenses', id));
    } else {
      await mockDB.deleteExpense(id);
    }
  },

  updateExpense: async (id: string, updates: { description: string; amount: number; dateStr: string; note: string }): Promise<void> => {
    if (hasRealFirebase && db) {
      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'expenses', id), updates as any);
    } else {
      await mockDB.updateExpense(id, updates);
    }
  },

  injectSeedData: async (): Promise<void> => {
    if (hasRealFirebase && db && auth) {
      const { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } = await import('firebase/auth');
      
      const uidMap: { [key: string]: string } = {};

      // 1. Register users and build mapping
      for (const user of SEED_USERS) {
        let realUid = '';
        const cleanPhone = user.phone.replace(/\D/g, '').slice(-11);
        const derivedEmail = `${cleanPhone}@lrc.com`;
        const derivedPwd = `lrc_secure_otp_${cleanPhone.slice(-10)}_2026_salt`;
        
        try {
          const cred = await createUserWithEmailAndPassword(auth, derivedEmail, derivedPwd);
          realUid = cred.user.uid;
        } catch (error: any) {
          if (error.code === 'auth/email-already-in-use') {
            try {
              const cred = await signInWithEmailAndPassword(auth, derivedEmail, derivedPwd);
              realUid = cred.user.uid;
            } catch (signInError) {
              console.error(`Failed to sign in as ${derivedEmail} to retrieve UID`, signInError);
              realUid = user.uid; // Fallback
            }
          } else {
            console.error(`Failed to create Auth user for ${derivedEmail}`, error);
            realUid = user.uid; // Fallback
          }
        }
        uidMap[user.uid] = realUid;

        // Write user document to Firestore with real UID
        const userProfile = {
          ...user,
          email: user.email || derivedEmail,
          uid: realUid,
          joinedAt: Date.now(),
          authProvider: 'phone' as const,
          carType: user.carType || 'none',
          address: user.address || 'Lalmai, Comilla',
        };
        await setDoc(doc(db!, 'users', realUid), userProfile);
        
        await setDoc(doc(db!, 'phone_mappings', cleanPhone), { email: userProfile.email, uid: realUid });
      }

      // 2. Seed Meetings
      const meetingsPromises = SEED_MEETINGS.map(meeting => {
        const mappedMeeting = {
          ...meeting,
          createdBy: uidMap[meeting.createdBy] || meeting.createdBy
        };
        return setDoc(doc(db!, 'meetings', meeting.id), mappedMeeting);
      });

      // 3. Seed Attendance
      const attendancePromises = SEED_ATTENDANCE.map(record => {
        const mappedRecord = {
          ...record,
          userId: uidMap[record.userId] || record.userId,
          markedBy: uidMap[record.markedBy] || record.markedBy
        };
        const newId = `${record.meetingId}_${mappedRecord.userId}`;
        return setDoc(doc(db!, 'attendance', newId), { ...mappedRecord, id: newId });
      });

      // 4. Seed Events
      const eventsPromises = SEED_EVENTS.map(event => {
        const mappedEvent = {
          ...event,
          createdBy: uidMap[event.createdBy] || event.createdBy
        };
        return setDoc(doc(db!, 'events', event.id), mappedEvent);
      });

      // 5. Seed Fees
      const feesPromises = SEED_FEES.map(fee => {
        const mappedFee = {
          ...fee,
          userId: uidMap[fee.userId] || fee.userId,
          receivedBy: fee.receivedBy ? (uidMap[fee.receivedBy] || fee.receivedBy) : null
        };
        const newId = `${mappedFee.userId}_${fee.month.replace('-', '_')}`;
        return setDoc(doc(db!, 'fees', newId), { ...mappedFee, id: newId });
      });

      // 6. Seed Announcements
      const announcementsPromises = SEED_ANNOUNCEMENTS.map(ann => {
        const mappedAnn = {
          ...ann,
          postedBy: uidMap[ann.postedBy] || ann.postedBy
        };
        return setDoc(doc(db!, 'announcements', ann.id), mappedAnn);
      });

      // 7. Seed Activities
      const activitiesPromises = SEED_ACTIVITIES.map(act => {
        const mappedAct = {
          ...act,
          postedBy: uidMap[act.postedBy] || act.postedBy,
          likedBy: act.likedBy.map(uid => uidMap[uid] || uid)
        };
        return setDoc(doc(db!, 'activities', act.id), mappedAct);
      });

      // 8. Seed Other Income
      const otherIncomePromises = SEED_OTHER_INCOME.map(inc => {
        const mappedInc = {
          ...inc,
          markedBy: uidMap[inc.markedBy] || inc.markedBy
        };
        return setDoc(doc(db!, 'other_income', inc.id), mappedInc);
      });

      // 9. Seed Expenses
      const expensesPromises = SEED_EXPENSES.map(exp => {
        const mappedExp = {
          ...exp,
          markedBy: uidMap[exp.markedBy] || exp.markedBy
        };
        return setDoc(doc(db!, 'expenses', exp.id), mappedExp);
      });

      await Promise.all([
        ...meetingsPromises,
        ...attendancePromises,
        ...eventsPromises,
        ...feesPromises,
        ...announcementsPromises,
        ...activitiesPromises,
        ...otherIncomePromises,
        ...expensesPromises
      ]);

      // Sign out so the user session refreshes to let the admin log in
      await signOut(auth);

    } else {
      // Clear mock DB data in AsyncStorage to force re-seeding
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem('LRC_MOCK_USERS');
      await AsyncStorage.removeItem('LRC_MOCK_MEETINGS');
      await AsyncStorage.removeItem('LRC_MOCK_ATTENDANCE');
      await AsyncStorage.removeItem('LRC_MOCK_EVENTS');
      await AsyncStorage.removeItem('LRC_MOCK_FEES');
      await AsyncStorage.removeItem('LRC_MOCK_ANNOUNCEMENTS');
      await AsyncStorage.removeItem('LRC_MOCK_ACTIVITIES');
      await AsyncStorage.removeItem('LRC_MOCK_AREAS');
      await AsyncStorage.removeItem('LRC_MOCK_OTHER_INCOME');
      await AsyncStorage.removeItem('LRC_MOCK_EXPENSES');
    }
  },

  /**
   * Migrates existing users in Firestore from the old `monthlyFee` field
   * to the new `yearlyFee` field.
   * - If a user has `monthlyFee` but no `yearlyFee`, sets `yearlyFee = 1200`
   *   (the new standard default), then deletes the `monthlyFee` field.
   * - Users that already have `yearlyFee` are skipped.
   * - Works on both real Firebase and mock DB.
   */
  migrateMonthlyToYearlyFee: async (): Promise<{ migrated: number; skipped: number }> => {
    const DEFAULT_YEARLY_FEE = 1200;
    let migrated = 0;
    let skipped = 0;

    if (hasRealFirebase && db) {
      const snapshot = await getDocs(collection(db, 'users'));
      const promises = snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data() as any;
        if ('monthlyFee' in data && !('yearlyFee' in data)) {
          const { deleteField } = await import('firebase/firestore');
          await updateDoc(doc(db!, 'users', docSnap.id), {
            yearlyFee: DEFAULT_YEARLY_FEE,
            monthlyFee: deleteField(),
          });
          migrated++;
        } else if ('monthlyFee' in data && 'yearlyFee' in data) {
          // Already migrated, just clean up the old field
          const { deleteField } = await import('firebase/firestore');
          await updateDoc(doc(db!, 'users', docSnap.id), {
            monthlyFee: deleteField(),
          });
          migrated++;
        } else {
          skipped++;
        }
      });
      await Promise.all(promises);
    } else {
      // Mock DB migration
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const raw = await AsyncStorage.getItem('LRC_MOCK_USERS');
      if (raw) {
        const users: any[] = JSON.parse(raw);
        let changed = false;
        for (const u of users) {
          if ('monthlyFee' in u) {
            if (!('yearlyFee' in u)) {
              u.yearlyFee = DEFAULT_YEARLY_FEE;
            }
            delete u.monthlyFee;
            changed = true;
            migrated++;
          } else {
            skipped++;
          }
        }
        if (changed) {
          await AsyncStorage.setItem('LRC_MOCK_USERS', JSON.stringify(users));
        }
      }
    }

    return { migrated, skipped };
  },

  runMigrationCheck: async (): Promise<void> => {
    if (!hasRealFirebase || !db) return;
    try {
      const { collection, getDocs } = require('firebase/firestore');
      const snapshot = await getDocs(collection(db, 'users'));
      const oldUsers = snapshot.docs
        .map((doc: any) => doc.data() as UserProfile)
        .filter((u: UserProfile) => u.authProvider !== 'phone' && u.phone);

      if (oldUsers.length === 0) return;
      console.log(`[Migration] Found ${oldUsers.length} users to migrate to Phone OTP Auth`);

      for (const oldUser of oldUsers) {
        try {
          await dbService.migrateUserToPhoneAuth(oldUser);
        } catch (err) {
          console.error(`[Migration] Failed to migrate user ${oldUser.name} (${oldUser.uid}):`, err);
        }
      }
    } catch (err) {
      console.error('[Migration] runMigrationCheck failed:', err);
    }
  },

  migrateUserToPhoneAuth: async (oldUser: UserProfile): Promise<void> => {
    if (!hasRealFirebase || !db) return;
    const cleanPhone = oldUser.phone.replace(/\D/g, '').slice(-11);
    if (!cleanPhone) {
      console.warn(`[Migration] User ${oldUser.name} has no valid phone number: ${oldUser.phone}`);
      return;
    }

    const { getSecondaryAuth } = require('./firebase');
    const secAuth = getSecondaryAuth();
    if (!secAuth) {
      throw new Error('Secondary auth client is not initialized');
    }

    const derivedEmail = `${cleanPhone}@lrc.com`;
    const derivedPwd = `lrc_secure_otp_${cleanPhone.slice(-10)}_2026_salt`;
    const oldUid = oldUser.uid;

    console.log(`[Migration] Creating secondary auth for ${oldUser.name} (${derivedEmail})`);
    
    // 1. Create Firebase Auth user
    let newUid: string;
    try {
      const { createUserWithEmailAndPassword, signOut } = require('firebase/auth');
      const cred = await createUserWithEmailAndPassword(secAuth, derivedEmail, derivedPwd);
      newUid = cred.user.uid;
      await signOut(secAuth);
    } catch (authErr: any) {
      if (authErr.code === 'auth/email-already-in-use') {
        const { signInWithEmailAndPassword, signOut } = require('firebase/auth');
        const cred = await signInWithEmailAndPassword(secAuth, derivedEmail, derivedPwd);
        newUid = cred.user.uid;
        await signOut(secAuth);
      } else {
        throw authErr;
      }
    }

    if (oldUid === newUid) {
      const { doc, updateDoc } = require('firebase/firestore');
      await updateDoc(doc(db, 'users', oldUid), {
        authProvider: 'phone',
        carType: oldUser.carType || 'none',
        address: oldUser.address || '',
        email: derivedEmail,
        originalEmail: oldUser.email || '',
      });
      return;
    }

    console.log(`[Migration] Rekeying ${oldUser.name} records from ${oldUid} to ${newUid}`);

    const { doc, setDoc, deleteDoc, collection, query, where, getDocs } = require('firebase/firestore');

    // 2. Copy user profile document
    const updatedProfile: UserProfile = {
      ...oldUser,
      uid: newUid,
      authProvider: 'phone',
      carType: oldUser.carType || 'none',
      address: oldUser.address || '',
      email: derivedEmail,
      originalEmail: oldUser.email || '',
    };
    await setDoc(doc(db, 'users', newUid), updatedProfile);

    // 3. Update payments
    const paymentsQ = query(collection(db, 'payments'), where('userId', '==', oldUid));
    const paymentsSnap = await getDocs(paymentsQ);
    for (const paymentDoc of paymentsSnap.docs) {
      const payData = paymentDoc.data();
      await setDoc(doc(db, 'payments', paymentDoc.id), { ...payData, userId: newUid });
    }

    // 4. Update member_attendance
    const memberAttQ = query(collection(db, 'member_attendance'), where('userId', '==', oldUid));
    const memberAttSnap = await getDocs(memberAttQ);
    for (const attDoc of memberAttSnap.docs) {
      const attData = attDoc.data();
      await setDoc(doc(db, 'member_attendance', attDoc.id), { ...attData, userId: newUid });
    }

    // 5. Update meeting attendance
    const meetAttQ = query(collection(db, 'attendance'), where('userId', '==', oldUid));
    const meetAttSnap = await getDocs(meetAttQ);
    for (const attDoc of meetAttSnap.docs) {
      const attData = attDoc.data();
      const newAttId = `${attData.meetingId}_${newUid}`;
      await setDoc(doc(db, 'attendance', newAttId), { ...attData, id: newAttId, userId: newUid });
      await deleteDoc(doc(db, 'attendance', attDoc.id));
    }

    // 6. Update event attendance
    const eventAttQ = query(collection(db, 'event_attendance'), where('userId', '==', oldUid));
    const eventAttSnap = await getDocs(eventAttQ);
    for (const attDoc of eventAttSnap.docs) {
      const attData = attDoc.data();
      const newAttId = `${attData.eventId}_${newUid}`;
      await setDoc(doc(db, 'event_attendance', newAttId), { ...attData, id: newAttId, userId: newUid });
      await deleteDoc(doc(db, 'event_attendance', attDoc.id));
    }

    // 7. Write phone mapping
    await setDoc(doc(db, 'phone_mappings', cleanPhone), { email: derivedEmail, uid: newUid });

    // 8. Delete old user document
    await deleteDoc(doc(db, 'users', oldUid));

    console.log(`[Migration] Successfully migrated user ${oldUser.name} from UID ${oldUid} to ${newUid}`);
  },
};
