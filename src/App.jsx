import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp,
  deleteDoc,
  writeBatch,
  setDoc
} from 'firebase/firestore';
import { 
  // 基礎圖示
  Star, CheckCircle2, XCircle, Trophy, BookOpen, BedDouble, 
  Trash2, Tv, Gamepad2, IceCream, Lock, History, PlusCircle, 
  LogOut, BarChart3, Settings, Users, User, Baby, Image as ImageIcon, 
  AlertTriangle, Edit, Home, Check, X, Info, Camera, Upload, RotateCcw
} from 'lucide-react';
import { 
  // 新增擴充圖示
  Zap, Heart, Sun, Cloud, Umbrella, Hammer, Wrench, 
  Car, Bus, Plane, Rocket, Calculator, Palette, Microscope, Globe,
  Crown, Medal, Lightbulb, Puzzle, Flag, Music, Gift, Smile,
  Utensils, Shirt, Bike, Apple,  Dna, GraduationCap, 
  Drum, Headphones, Dumbbell, Footprints
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyAta6sbY6lT9_uzcLY8any35w3dEmdPEzc",
  authDomain: "super-helper-v2.firebaseapp.com",
  projectId: "super-helper-v2",
  storageBucket: "super-helper-v2.firebasestorage.app",
  messagingSenderId: "963910382762",
  appId: "1:963910382762:web:30ff50d98a09e74c0eccd3",
  measurementId: "G-GN4QGZ8EYF"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "my-family-app-v1"; 

// --- Constants ---
const DEFAULT_PIN = "1234";

const ICON_MAP = {
  // 日常
  'bed': BedDouble, 'book': BookOpen, 'clean': CheckCircle2, 'shirt': Shirt, 'utensils': Utensils,
  // 娛樂 & 獎勵
  'tv': Tv, 'game': Gamepad2, 'food': IceCream, 'gift': Gift, 'toy': Trophy,
  // 學習 & 才藝
  'music': Music, 'drum': Drum, 'headphones': Headphones, 'palette': Palette, 'calculator': Calculator, 
  'microscope': Microscope, 'globe': Globe, 'dna': Dna, 'grad': GraduationCap,
  // 戶外 & 運動
  'bike': Bike, 'car': Car, 'bus': Bus, 'plane': Plane, 'rocket': Rocket, 'dumbbell': Dumbbell, 'foot': Footprints,
  // 其他酷東西
  'star': Star, 'crown': Crown, 'medal': Medal, 'zap': Zap, 'heart': Heart, 'smile': Smile,
  'sun': Sun, 'cloud': Cloud, 'umbrella': Umbrella, 'hammer': Hammer, 'wrench': Wrench, 
  'bulb': Lightbulb, 'puzzle': Puzzle, 'flag': Flag, 'apple': Apple
};

const AVATAR_COLORS = ['bg-blue-500', 'bg-pink-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500', 'bg-teal-500', 'bg-rose-500', 'bg-indigo-500'];

// --- Helper Component for Icons ---
const DynamicIcon = ({ iconKey, size = 24, className = "" }) => {
  const IconComponent = ICON_MAP[iconKey] || Star;
  return <IconComponent size={size} className={className} />;
};

// --- Safe Render Helper ---
const safeRender = (val) => {
  if (typeof val === 'object') return JSON.stringify(val);
  if (val === undefined || val === null) return '';
  return val;
};

const safePoints = (val) => {
  const num = parseInt(val);
  return isNaN(num) ? 0 : num;
};

// --- Image Compression ---
const compressImage = (file, maxWidth = 800) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

// --- Main Component ---

export default function SuperHelperApp() {
  const storedFamilyId = localStorage.getItem('super_helper_family_id') || "";

  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [loading, setLoading] = useState(true);

  // State: Views & Logic
  const [view, setView] = useState(storedFamilyId ? 'profile-select' : 'family-login'); 
  const [familyId, setFamilyId] = useState(storedFamilyId);
  const [tempFamilyId, setTempFamilyId] = useState("");
  
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [children, setChildren] = useState([]);
  const [bgImage, setBgImage] = useState(""); 
  const [selectedChild, setSelectedChild] = useState(null); 
  
  // UI States
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  
  // Inputs
  const [pinInput, setPinInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  // Edit States
  const [editingItem, setEditingItem] = useState(null); 
  const [editingType, setEditingType] = useState(null); 
  const [newItemName, setNewItemName] = useState("");
  const [newItemPoints, setNewItemPoints] = useState("");
  const [newItemIcon, setNewItemIcon] = useState("star");
  
  const [newChildName, setNewChildName] = useState("");
  const [tempBgInput, setTempBgInput] = useState(""); 
  
  // Child Editing States
  const [editingChildId, setEditingChildId] = useState(null);
  const [newChildAvatar, setNewChildAvatar] = useState(null);
  
  const childAvatarInputRef = useRef(null);
  const bgImageInputRef = useRef(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // --- Auth ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        if (err.code === 'auth/configuration-not-found') {
          setAuthError('config_missing');
        } else {
          console.error("Login failed:", err);
        }
        setLoading(false);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Data Fetching ---
  useEffect(() => {
    if (!user || !familyId) return;
    const prefix = `${familyId}_`;

    const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', `${prefix}settings`, 'config'), (docSnap) => {
      if (docSnap.exists()) setBgImage(docSnap.data().backgroundImage || "");
    });

    const unsubActivities = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', `${prefix}activities`), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setActivities(data);
    });

    const unsubTasks = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', `${prefix}tasks`), (snapshot) => {
      setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubRewards = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', `${prefix}rewards`), (snapshot) => {
      setRewards(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubChildren = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', `${prefix}children`), (snapshot) => {
      setChildren(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubSettings(); unsubActivities(); unsubTasks(); unsubRewards(); unsubChildren(); };
  }, [user, familyId]);

  // --- Handlers ---

  const handleFamilyLogin = () => {
    if (!tempFamilyId.trim()) return showToast("請輸入家庭代碼");
    const code = tempFamilyId.trim();
    localStorage.setItem('super_helper_family_id', code);
    setFamilyId(code);
    setView('profile-select');
  };

  const handleLogoutClick = () => setShowLogoutConfirm(true);
  const confirmLogout = () => {
    localStorage.removeItem('super_helper_family_id');
    setFamilyId("");
    setView('family-login');
    setTempFamilyId("");
    setShowLogoutConfirm(false);
  };

  const handleChildAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return showToast("照片太大了");
    showToast("處理照片中...");
    try {
      const base64 = await compressImage(file, 300);
      setNewChildAvatar(base64); 
    } catch (err) {
      console.error(err);
      showToast("照片處理失敗");
    }
  };

  const handleBgUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    showToast("背景上傳中...");
    try {
      const base64 = await compressImage(file, 1024);
      const prefix = `${familyId}_`;
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', `${prefix}settings`, 'config'), { backgroundImage: base64 }, { merge: true });
      showToast("背景已更新！");
    } catch (err) {
      console.error(err);
      showToast("上傳失敗");
    }
  };

  const startEditing = (item, type) => {
    setEditingItem(item);
    setEditingType(type); 
    setNewItemName(item.title || "");
    setNewItemPoints(item.points || item.cost || ""); 
    setNewItemIcon(item.iconKey || "star");
  };

  const cancelEditing = () => {
    setEditingItem(null); setEditingType(null);
    setNewItemName(""); setNewItemPoints(""); setNewItemIcon("star");
  };

  const handleSaveItem = async () => {
    if (!user || !familyId) return;
    if (!newItemName || !newItemPoints) return showToast("請輸入名稱和分數");
    if (!editingType) return; 

    const prefix = `${familyId}_`;
    const collRef = collection(db, 'artifacts', appId, 'public', 'data', `${prefix}${editingType}`);
    const payload = { title: newItemName, iconKey: newItemIcon, points: parseInt(newItemPoints), cost: parseInt(newItemPoints) };

    if (editingItem && editingItem.id) {
      await updateDoc(doc(collRef, editingItem.id), payload);
      showToast("修改成功！");
    } else {
      await addDoc(collRef, payload);
      showToast("新增成功！");
    }
    cancelEditing();
  };

  const prepareAddItem = (type) => {
    setEditingItem({}); setEditingType(type);
    setNewItemName(""); setNewItemPoints(""); setNewItemIcon("star");
  };

  const handleDeleteConfigItem = async (collectionName, id) => {
    if (!user || !familyId) return;
    if(confirm("確定要刪除這個項目嗎？")) {
       const prefix = `${familyId}_`;
       await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', `${prefix}${collectionName}`, id));
    }
  };

  const handleSaveBgUrl = async () => {
    if (!user || !familyId) return;
    const prefix = `${familyId}_`;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', `${prefix}settings`, 'config'), { backgroundImage: tempBgInput }, { merge: true });
    showToast("背景設定已更新！"); setTempBgInput("");
  };
  
  const handleClearBg = async () => {
    const prefix = `${familyId}_`;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', `${prefix}settings`, 'config'), { backgroundImage: "" }, { merge: true });
  };

  const getChildBalance = (childId) => {
    return activities.filter(a => a.childId === childId && a.status === 'approved')
      .reduce((acc, curr) => curr.type === 'earn' ? acc + safePoints(curr.points) : acc - safePoints(curr.points), 0);
  };

  // --- Child Management Handlers ---

  const startEditingChild = (child) => {
    setEditingChildId(child.id);
    setNewChildName(child.name);
    setNewChildAvatar(child.avatar || null);
    // Optional: Scroll to edit form if needed
  };

  const cancelEditingChild = () => {
    setEditingChildId(null);
    setNewChildName("");
    setNewChildAvatar(null);
  };

  const handleSaveChild = async () => {
    if (!newChildName.trim()) return showToast("請輸入名字");
    const prefix = `${familyId}_`;
    
    if (editingChildId) {
      // Update
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', `${prefix}children`, editingChildId), {
        name: newChildName,
        avatar: newChildAvatar || null
      });
      showToast("更新成功！");
      cancelEditingChild();
    } else {
      // Create
      const color = AVATAR_COLORS[children.length % AVATAR_COLORS.length];
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', `${prefix}children`), { 
        name: newChildName, color, createdAt: serverTimestamp(), avatar: newChildAvatar || null 
      });
      showToast("新增成功！");
      setNewChildName(""); 
      setNewChildAvatar(null);
    }
  };

  const handleDeleteChild = async (id) => { 
    if(confirm("確定刪除這位小朋友嗎？")) {
      const prefix = `${familyId}_`;
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', `${prefix}children`, id)); 
    }
  };

  const handleSelectChild = (child) => { setSelectedChild(child); setView('child'); };

  const handleSubmitActivity = async (title, points, type) => {
    if (!user || !selectedChild || !familyId) return;
    const currentBalance = getChildBalance(selectedChild.id);
    if (type === 'spend' && currentBalance < points) { showToast("金幣不夠喔！"); return; }
    const prefix = `${familyId}_`;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', `${prefix}activities`), {
      title, points: parseInt(points), type, status: 'pending', childId: selectedChild.id, childName: selectedChild.name, createdAt: serverTimestamp()
    });
    if (navigator.vibrate) navigator.vibrate(100); 
    showToast("已送出申請！");
  };

  const handleProcess = async (id, status) => { 
    const prefix = `${familyId}_`;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', `${prefix}activities`, id), { status }); 
  };
  
  const handleParentLogin = () => {
    if (pinInput === DEFAULT_PIN) { setView('parent'); setPinInput(""); setErrorMsg(""); } else { setErrorMsg("密碼錯誤"); }
  };

  if (authError === 'config_missing') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-red-50">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4"/>
        <h2 className="text-xl font-bold mb-2">請先開啟 Firebase Auth</h2>
        <p className="text-gray-600 mb-4">請到 Firebase Console &gt; Authentication，將 Anonymous 登入開啟。</p>
        <button onClick={() => window.location.reload()} className="bg-indigo-600 text-white px-6 py-2 rounded-lg">重試</button>
      </div>
    </div>
  );

  if (loading) return <div className="min-h-screen flex justify-center items-center bg-yellow-50 text-xl font-bold text-yellow-600">載入中...</div>;

  // VIEW: Family Login
  if (!familyId || view === 'family-login') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-yellow-50 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
          <div className="mx-auto bg-yellow-100 w-20 h-20 rounded-full flex items-center justify-center text-yellow-600 mb-6">
            <Home size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">小朋友集點卡</h1>
          <p className="text-gray-500 mb-8">請輸入「家庭代碼」同步資料</p>
          <div className="mb-6">
            <input type="text" value={tempFamilyId} onChange={e => setTempFamilyId(e.target.value)} placeholder="輸入家庭代碼 (例: LoveFamily)" className="w-full border-2 border-yellow-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-yellow-500 transition text-center"/>
          </div>
          <button onClick={handleFamilyLogin} className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-4 rounded-xl text-lg shadow-md transition transform active:scale-95">開始使用</button>
        </div>
        {toastMsg && <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg z-50 animate-bounce">{toastMsg}</div>}
      </div>
    );
  }

  // --- Main Layout ---
  return (
    <div style={{
      backgroundImage: bgImage ? `url(${bgImage})` : 'none',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      minHeight: '100vh'
    }}>
      <div className={`min-h-screen transition-colors duration-500 ${bgImage ? 'bg-white/85' : (view.includes('parent') ? 'bg-gray-100' : 'bg-yellow-50')}`}>
        
        {/* VIEW: Profile Select */}
        {view === 'profile-select' && (
          <div className="flex flex-col items-center justify-center min-h-screen w-full px-4 py-10">
            <h1 className="text-4xl font-bold text-yellow-800 mb-4 drop-shadow-sm">你是誰？</h1>
            
            <div className="flex items-center gap-3 mb-10 bg-yellow-100/60 px-5 py-2 rounded-full backdrop-blur-sm">
               <p className="text-yellow-800 font-bold">家庭: {familyId}</p>
               <div className="w-px h-4 bg-yellow-300"></div>
               <button onClick={handleLogoutClick} className="text-yellow-700 hover:text-red-600 text-sm font-bold flex items-center gap-1 transition-colors px-2 py-1 rounded" title="登出並切換家庭"><LogOut size={16} /> 更換</button>
            </div>
            
            <div className="flex flex-wrap justify-center gap-8 w-full max-w-6xl mb-12">
              {children.map(child => (
                <button key={child.id} onClick={() => handleSelectChild(child)} className="w-40 h-40 md:w-48 md:h-48 bg-white/90 p-4 rounded-[2.5rem] shadow-xl hover:scale-105 transition transform flex flex-col items-center justify-center gap-3 backdrop-blur-sm group cursor-pointer relative overflow-hidden">
                  {child.avatar ? (
                    <img src={child.avatar} alt={child.name} className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-4 border-white shadow-md" />
                  ) : (
                    <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full ${child.color || 'bg-blue-500'} flex items-center justify-center text-white shadow-inner group-hover:ring-4 ring-yellow-200 transition-all`}><User size={40} className="md:w-12 md:h-12" /></div>
                  )}
                  <span className="text-xl md:text-2xl font-bold text-gray-700 truncate w-full text-center">{safeRender(child.name)}</span>
                  <span className="text-sm bg-yellow-100 text-yellow-700 px-3 py-0.5 rounded-full font-black">${getChildBalance(child.id)}</span>
                </button>
              ))}
              
              {children.length === 0 && (
                 <div className="w-full max-w-md text-center text-gray-400 py-10 bg-white/40 rounded-3xl border-4 border-dashed border-gray-300">
                   <p className="text-xl">還沒有建立小朋友檔案</p>
                   <p className="text-sm mt-2">請點擊下方「家長專區」設定</p>
                 </div>
              )}
            </div>

            <button onClick={() => setView('login')} className="flex items-center text-gray-600 font-bold bg-white/80 px-8 py-4 rounded-full hover:bg-white shadow-md transition backdrop-blur-sm text-lg">
              <Lock size={20} className="mr-2" /> 家長專區
            </button>
          </div>
        )}

        {/* VIEW: Login */}
        {view === 'login' && (
          <div className="flex flex-col items-center justify-center p-6 min-h-screen w-full">
            <div className="bg-white/95 w-full max-w-sm p-10 rounded-3xl shadow-2xl text-center backdrop-blur-md">
              <button onClick={() => setView('profile-select')} className="absolute top-6 left-6 text-gray-400 hover:text-gray-600"><LogOut/></button>
              <div className="mx-auto bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center text-indigo-600 mb-4"><Lock size={32} /></div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">家長專區</h2>
              <input type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} maxLength={4} className="text-center text-4xl tracking-widest w-full border-b-2 border-indigo-300 mb-6 outline-none py-2 bg-transparent text-gray-800 font-mono" placeholder="••••"/>
              {errorMsg && <p className="text-red-500 mb-4">{errorMsg}</p>}
              <button onClick={handleParentLogin} className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold shadow-lg hover:bg-indigo-700 transition">進入</button>
            </div>
          </div>
        )}

        {/* VIEW: Child Stats & Main */}
        {(view === 'child' || view === 'child-stats') && selectedChild && (
          <div className="pb-20 font-sans min-h-screen w-full max-w-6xl mx-auto">
             {/* Top Bar */}
             {view === 'child' && (
               <div className="bg-yellow-400/90 backdrop-blur-md p-6 rounded-b-[3rem] shadow-lg text-center relative mb-8">
                  <div className="absolute top-6 left-6 flex gap-3">
                     <button onClick={() => setView('profile-select')} className="bg-white/30 px-4 py-2 rounded-full text-yellow-900 hover:bg-white/50 transition flex items-center font-bold text-sm"><Users size={18} className="mr-1"/> 小朋友換人</button>
                  </div>
                  <button onClick={() => setView('child-stats')} className="absolute top-6 right-6 bg-white/30 p-2 rounded-full text-yellow-900 hover:bg-white/50 transition" title="我的紀錄"><BarChart3 size={24} /></button>
                  
                  {selectedChild.avatar ? <img src={selectedChild.avatar} alt={selectedChild.name} className="mx-auto w-20 h-20 rounded-full object-cover border-4 border-white shadow-md mb-2" /> : <div className={`mx-auto w-20 h-20 rounded-full ${selectedChild.color} flex items-center justify-center text-white shadow-md mb-2 border-4 border-white`}><User size={40} /></div>}
                  <h1 className="text-3xl font-bold text-yellow-900 mb-1">你好，{safeRender(selectedChild.name)}！</h1>
                  <div className="inline-flex items-center bg-white px-8 py-3 rounded-full shadow-md transform translate-y-8"><Star className="text-yellow-500 fill-yellow-500 mr-3" size={36} /><span className="text-5xl font-black text-yellow-600">{getChildBalance(selectedChild.id)}</span></div>
               </div>
             )}
             
             {/* Stats View */}
             {view === 'child-stats' && (
               <div className="p-4 w-full max-w-3xl mx-auto">
                  <div className={`${selectedChild.color} p-6 text-white rounded-3xl shadow-lg mb-6 relative`}>
                    <button onClick={() => setView('child')} className="absolute top-6 left-6 bg-white/20 p-2 rounded-full"><LogOut size={20}/></button>
                    <h1 className="text-2xl font-bold text-center">{safeRender(selectedChild.name)} 的紀錄</h1>
                    <div className="flex mt-6 justify-around text-center">
                      <div><p className="text-white/80 mb-1">總共賺了</p><p className="text-4xl font-black">{activities.filter(a => a.childId === selectedChild.id && a.status === 'approved' && a.type === 'earn').reduce((a,b) => a+safePoints(b.points), 0)}</p></div>
                      <div className="w-px bg-white/40"></div>
                      <div><p className="text-white/80 mb-1">總共花費</p><p className="text-4xl font-black">{activities.filter(a => a.childId === selectedChild.id && a.status === 'approved' && a.type === 'spend').reduce((a,b) => a+safePoints(b.points), 0)}</p></div>
                    </div>
                  </div>
                  <div className="bg-white/90 rounded-3xl shadow-sm overflow-hidden p-4">
                    <div className="max-h-[60vh] overflow-y-auto">
                       {activities.filter(a => a.childId === selectedChild.id && a.status === 'approved').length === 0 ? <div className="text-center text-gray-400 py-10">還沒有紀錄</div> : 
                         <table className="w-full text-left">
                           <thead className="text-gray-500 border-b"><tr><th className="p-3">日期</th><th className="p-3">項目</th><th className="p-3 text-right">分數</th></tr></thead>
                           <tbody>{activities.filter(a => a.childId === selectedChild.id && a.status === 'approved').map(act => (
                             <tr key={act.id} className="border-b border-gray-50"><td className="p-3 text-gray-500">{act.createdAt ? new Date(act.createdAt.seconds * 1000).toLocaleDateString('zh-TW', {month:'numeric', day:'numeric'}) : '-'}</td><td className="p-3 font-bold text-gray-700">{safeRender(act.title)}</td><td className={`p-3 text-right font-bold ${act.type === 'earn' ? 'text-yellow-600' : 'text-indigo-600'}`}>{act.type === 'earn' ? '+' : '-'}{safePoints(act.points)}</td></tr>
                           ))}</tbody>
                         </table>
                       }
                    </div>
                  </div>
               </div>
             )}

             {/* Main Actions */}
             {view === 'child' && (
                <div className="mt-16 px-6 w-full">
                  <h2 className="text-2xl font-bold text-yellow-800 mb-6 flex items-center"><PlusCircle className="mr-2" /> 賺取金幣</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 mb-10">
                    {tasks.map(task => (
                      <button key={task.id} onClick={() => handleSubmitActivity(task.title, task.points || task.cost, 'earn')} className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl shadow-md border-b-4 border-yellow-200 active:translate-y-1 active:border-b-0 transition flex flex-col items-center gap-3 hover:bg-yellow-50 group cursor-pointer">
                        <div className="text-yellow-600 bg-yellow-100 p-4 rounded-full group-hover:scale-110 transition"><DynamicIcon iconKey={task.iconKey} size={32} /></div>
                        <span className="font-bold text-gray-700 text-lg text-center leading-tight">{safeRender(task.title)}</span>
                        <span className="text-lg font-black text-yellow-600">+{safePoints(task.points || task.cost)}</span>
                      </button>
                    ))}
                    {tasks.length === 0 && <div className="col-span-full text-center text-gray-400 py-4">還沒有任務，請爸爸媽媽新增</div>}
                  </div>

                  <h2 className="text-2xl font-bold text-indigo-800 mb-6 flex items-center"><IceCream className="mr-2" /> 兌換禮物</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 mb-10">
                    {rewards.map(reward => (
                      <button key={reward.id} onClick={() => handleSubmitActivity(reward.title, reward.cost || reward.points, 'spend')} disabled={getChildBalance(selectedChild.id) < (reward.cost || reward.points)} 
                        className={`p-6 rounded-3xl shadow-md border-b-4 active:translate-y-1 active:border-b-0 transition flex flex-col items-center gap-3 backdrop-blur-sm cursor-pointer ${getChildBalance(selectedChild.id) >= (reward.cost || reward.points) ? 'bg-white/90 border-indigo-200 hover:bg-indigo-50' : 'bg-gray-100/80 border-gray-300 opacity-70 cursor-not-allowed'}`}>
                        <div className={`p-4 rounded-full ${getChildBalance(selectedChild.id) >= (reward.cost || reward.points) ? 'text-indigo-600 bg-indigo-100' : 'text-gray-400 bg-gray-200'}`}><DynamicIcon iconKey={reward.iconKey} size={32} /></div>
                        <span className="font-bold text-gray-700 text-lg text-center leading-tight">{safeRender(reward.title)}</span>
                        <span className="text-lg font-black text-indigo-600">-{safePoints(reward.cost || reward.points)}</span>
                      </button>
                    ))}
                    {rewards.length === 0 && <div className="col-span-full text-center text-gray-400 py-4">還沒有獎勵，請爸爸媽媽新增</div>}
                  </div>
                </div>
             )}
          </div>
        )}

        {/* VIEW: Parent Settings */}
        {view === 'parent-settings' && (
          <div className="pb-10 font-sans min-h-screen w-full max-w-5xl mx-auto">
            <div className="bg-indigo-900 text-white p-6 shadow-lg sticky top-0 z-10 rounded-b-2xl mx-4 mt-4 mb-6 flex justify-between items-center">
               <h1 className="text-xl font-bold flex items-center"><Settings className="mr-2"/> 系統設定</h1>
               <button onClick={() => { cancelEditing(); setView('parent'); }} className="bg-indigo-700 px-4 py-2 rounded-lg text-sm hover:bg-indigo-600">返回</button>
            </div>
            
            <div className="p-4 space-y-8">
              <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-sm p-6">
                 <h2 className="font-bold text-gray-700 mb-4 flex items-center text-lg border-b pb-2"><ImageIcon className="mr-2"/> 背景圖片</h2>
                 <div className="flex flex-col sm:flex-row gap-4">
                   <div className="relative group">
                     <button onClick={() => bgImageInputRef.current.click()} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-3 rounded-xl font-bold flex items-center border-2 border-dashed border-gray-300 w-full sm:w-auto justify-center"><Upload className="mr-2" size={20}/> 上傳照片</button>
                     <input type="file" ref={bgImageInputRef} onChange={handleBgUpload} accept="image/*" className="hidden" />
                   </div>
                   <div className="flex-1 flex gap-2">
                     <input type="text" value={tempBgInput} onChange={e => setTempBgInput(e.target.value)} placeholder="或貼上圖片網址" className="flex-1 border rounded-xl px-4 py-2"/>
                     <button onClick={handleSaveBgUrl} className="bg-gray-800 text-white px-4 rounded-lg font-bold text-sm whitespace-nowrap">網址儲存</button>
                   </div>
                 </div>
                 {bgImage && <button onClick={handleClearBg} className="text-red-500 text-sm mt-3 hover:underline flex items-center"><Trash2 size={14} className="mr-1"/>移除目前背景</button>}
              </div>

              <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-sm p-6">
                 <h2 className="font-bold text-gray-700 mb-4 flex items-center text-lg border-b pb-2"><Baby className="mr-2"/> 小朋友檔案</h2>
                 <div className="flex flex-wrap gap-3 mb-6">
                   {children.map(child => (
                     <div key={child.id} className="flex items-center bg-gray-50 border rounded-full pl-3 pr-2 py-1.5">
                        {child.avatar ? <img src={child.avatar} className="w-8 h-8 rounded-full object-cover mr-2"/> : <div className={`w-8 h-8 rounded-full ${child.color} mr-2`}></div>}
                        <span className="font-bold text-gray-700 mr-3">{safeRender(child.name)}</span>
                        <button onClick={() => startEditingChild(child)} className="text-blue-400 hover:text-blue-600 bg-white rounded-full p-1 mr-1"><Edit size={14}/></button>
                        <button onClick={() => handleDeleteChild(child.id)} className="text-gray-400 hover:text-red-500 bg-white rounded-full p-1"><Trash2 size={14}/></button>
                     </div>
                   ))}
                 </div>
                 <div className="flex flex-col gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200 relative">
                   {/* Hint editing mode */}
                   {editingChildId && (
                     <div className="absolute top-0 right-0 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-bl-xl rounded-tr-xl font-bold">
                       正在編輯 {children.find(c => c.id === editingChildId)?.name}
                     </div>
                   )}
                   <div className="flex items-center gap-4">
                     <div className="relative cursor-pointer" onClick={() => childAvatarInputRef.current.click()}>
                       {newChildAvatar ? <img src={newChildAvatar} className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500" /> : <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-300 border-2 border-dashed border-gray-400"><Camera size={20} /></div>}
                       <input type="file" ref={childAvatarInputRef} onChange={handleChildAvatarUpload} accept="image/*" className="hidden" />
                       {newChildAvatar && <div onClick={(e) => { e.stopPropagation(); setNewChildAvatar(null); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X size={12}/></div>}
                     </div>
                     <div className="flex-1 flex gap-2">
                        <input type="text" value={newChildName} onChange={e => setNewChildName(e.target.value)} placeholder="輸入小朋友名字" className="flex-1 border rounded-xl px-4 py-2"/>
                        {editingChildId ? (
                          <>
                            <button onClick={cancelEditingChild} className="bg-gray-200 text-gray-600 px-4 rounded-xl font-bold flex items-center hover:bg-gray-300">取消</button>
                            <button onClick={handleSaveChild} className="bg-blue-600 text-white px-6 rounded-xl font-bold flex items-center hover:bg-blue-700">儲存修改</button>
                          </>
                        ) : (
                          <button onClick={handleSaveChild} className="bg-green-600 text-white px-6 rounded-xl font-bold flex items-center hover:bg-green-700">新增</button>
                        )}
                     </div>
                   </div>
                   {newChildAvatar && <p className="text-xs text-green-600 ml-1">✓ 已選取照片 (可點擊更換)</p>}
                 </div>
              </div>

              <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${editingItem ? 'block' : 'hidden'}`}>
                <div className="bg-white p-6 rounded-3xl w-full max-w-md mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                  <h3 className="text-xl font-bold mb-4 text-gray-800">編輯項目</h3>
                  <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-500 mb-1">圖示</label>
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-xl">{Object.keys(ICON_MAP).map(k => (<button key={k} onClick={() => setNewItemIcon(k)} className={`p-3 rounded-xl border-2 transition ${newItemIcon === k ? 'border-indigo-500 bg-indigo-50' : 'border-transparent bg-gray-50'}`}><DynamicIcon iconKey={k} size={24} /></button>))}</div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-500 mb-1">名稱</label>
                    <input type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} className="w-full border rounded-xl px-4 py-2 text-lg"/>
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-500 mb-1">分數/點數</label>
                    <input type="number" value={newItemPoints} onChange={e => setNewItemPoints(e.target.value)} className="w-full border rounded-xl px-4 py-2 text-lg"/>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={cancelEditing} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold">取消</button>
                    <button onClick={() => handleSaveItem()} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold">儲存修改</button>
                  </div>
                </div>
              </div>

              <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-sm p-6">
                <h2 className="font-bold text-gray-700 mb-4 flex items-center text-lg border-b pb-2">管理「賺取任務」</h2>
                <div className="space-y-2 mb-6">
                  {tasks.map(task => (
                    <div key={task.id} className="p-3 bg-gray-50 rounded-2xl flex justify-between items-center">
                      <div className="flex items-center gap-3"><div className="text-yellow-600 bg-white p-2 rounded-full shadow-sm"><DynamicIcon iconKey={task.iconKey} size={24} /></div><div><p className="font-bold text-gray-800">{safeRender(task.title)}</p><p className="text-xs text-gray-500">+{safePoints(task.points || task.cost)} 分</p></div></div>
                      <div className="flex gap-2"><button onClick={() => startEditing(task, 'tasks')} className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg"><Edit size={18}/></button><button onClick={() => handleDeleteConfigItem('tasks', task.id)} className="p-2 text-red-400 hover:bg-red-100 rounded-lg"><Trash2 size={18}/></button></div>
                    </div>
                  ))}
                </div>
                <div className="text-center"><button onClick={() => prepareAddItem('tasks')} className="bg-indigo-50 text-indigo-600 px-6 py-3 rounded-xl font-bold w-full border-2 border-dashed border-indigo-200 hover:bg-indigo-100 transition">+ 新增任務</button></div>
              </div>

              <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-sm p-6">
                <h2 className="font-bold text-gray-700 mb-4 flex items-center text-lg border-b pb-2">管理「兌換獎勵」</h2>
                <div className="space-y-2 mb-6">
                  {rewards.map(reward => (
                    <div key={reward.id} className="p-3 bg-gray-50 rounded-2xl flex justify-between items-center">
                      <div className="flex items-center gap-3"><div className="text-indigo-600 bg-white p-2 rounded-full shadow-sm"><DynamicIcon iconKey={reward.iconKey} size={24} /></div><div><p className="font-bold text-gray-800">{safeRender(reward.title)}</p><p className="text-xs text-gray-500">-{safePoints(reward.cost || reward.points)} 分</p></div></div>
                      <div className="flex gap-2"><button onClick={() => startEditing(reward, 'rewards')} className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg"><Edit size={18}/></button><button onClick={() => handleDeleteConfigItem('rewards', reward.id)} className="p-2 text-red-400 hover:bg-red-100 rounded-lg"><Trash2 size={18}/></button></div>
                    </div>
                  ))}
                </div>
                <div className="text-center"><button onClick={() => prepareAddItem('rewards')} className="bg-indigo-50 text-indigo-600 px-6 py-3 rounded-xl font-bold w-full border-2 border-dashed border-indigo-200 hover:bg-indigo-100 transition">+ 新增獎勵</button></div>
              </div>

              <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-sm p-6">
                 <h2 className="font-bold text-gray-700 mb-4 flex items-center text-lg border-b pb-2"><Users className="mr-2"/> 家庭帳號</h2>
                 <p className="text-gray-600 mb-4">目前的家庭代碼：<span className="font-mono font-bold bg-gray-100 px-2 py-1 rounded">{familyId}</span></p>
                 <button onClick={handleLogoutClick} className="text-red-500 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50">登出此家庭 (更換裝置)</button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: Parent Dashboard */}
        {view === 'parent' && (
          <div className="pb-10 font-sans min-h-screen w-full max-w-5xl mx-auto">
            <div className="bg-indigo-900 text-white p-6 shadow-lg sticky top-0 z-10 rounded-b-2xl mx-4 mt-4 mb-6 flex justify-between items-center">
               <h1 className="text-2xl font-bold">家長管理後台</h1>
               <div className="flex gap-2">
                  <button onClick={() => setView('parent-settings')} className="bg-indigo-800 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm flex items-center"><Settings size={18} className="mr-1" /> 設定</button>
                  <button onClick={() => setView('profile-select')} className="bg-indigo-700 hover:bg-indigo-600 px-4 py-2 rounded-lg text-sm flex items-center"><LogOut size={18} className="mr-1" /> 登出</button>
               </div>
            </div>
            <div className="p-4 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {children.map(child => (
                   <div key={child.id} className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-sm border-l-4 border-indigo-500">
                      <h3 className="font-bold text-gray-500 text-sm mb-1">{safeRender(child.name)}</h3>
                      <p className="text-3xl font-black text-indigo-900">{getChildBalance(child.id)}</p>
                   </div>
                 ))}
                 {children.length === 0 && <div className="col-span-full text-center bg-white/50 p-6 rounded-2xl text-gray-500">請先至設定頁面新增小朋友</div>}
              </div>

              <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-orange-50 flex justify-between items-center"><h2 className="font-bold text-orange-800 flex items-center"><CheckCircle2 className="mr-2" size={20} /> 待審核 ({activities.filter(a => a.status === 'pending').length})</h2></div>
                <div className="divide-y divide-gray-100">
                  {activities.filter(a => a.status === 'pending').length === 0 ? (<div className="p-12 text-center text-gray-400"><CheckCircle2 size={64} className="mx-auto mb-4 opacity-20" /><p>目前沒有待審核的申請</p></div>) : (
                    activities.filter(a => a.status === 'pending').map(item => (
                      <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition">
                        <div><div className="flex items-center gap-2 mb-1"><span className="bg-gray-800 text-white text-xs px-2 py-0.5 rounded-full">{safeRender(item.childName) || '未知'}</span><span className="text-gray-500 text-xs">{item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleString('zh-TW') : '剛剛'}</span></div><div className="flex items-center gap-2"><span className={`px-2 py-1 rounded text-xs font-bold ${item.type === 'earn' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{item.type === 'earn' ? '任務' : '兌換'}</span><span className="font-bold text-gray-800 text-lg">{safeRender(item.title)}</span></div></div>
                        <div className="flex items-center gap-4"><span className={`font-bold text-2xl ${item.type === 'earn' ? 'text-yellow-600' : 'text-blue-600'}`}>{item.type === 'earn' ? '+' : '-'}{safePoints(item.points)}</span><div className="flex gap-2"><button onClick={() => handleProcess(item.id, 'rejected')} className="p-3 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition"><XCircle size={24} /></button><button onClick={() => handleProcess(item.id, 'approved')} className="p-3 bg-green-100 text-green-600 rounded-xl hover:bg-green-200 transition"><CheckCircle2 size={24} /></button></div></div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-sm overflow-hidden p-4">
                 <div className="flex items-center text-gray-500 mb-4"><History size={20} className="mr-2"/>近期紀錄</div>
                 <div className="space-y-2">
                   {activities.filter(a => a.status !== 'pending').slice(0,5).map(item => (
                     <div key={item.id} className="flex justify-between text-sm text-gray-600 border-b border-gray-50 pb-2">
                        <span>{safeRender(item.childName)} - {safeRender(item.title)}</span>
                        <span className={item.type==='earn'?'text-yellow-600':'text-blue-600'}>{item.type==='earn'?'+':'-'}{safePoints(item.points)} ({item.status==='approved'?'已核准':'已拒絕'})</span>
                     </div>
                   ))}
                 </div>
              </div>
            </div>
          </div>
        )}

        {toastMsg && <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-800/90 text-white px-6 py-3 rounded-full shadow-xl z-50 animate-bounce font-bold text-center">{toastMsg}</div>}
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl transform transition-all scale-100">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500 mx-auto"><LogOut size={24} /></div>
              <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">切換家庭帳號</h3>
              <p className="text-gray-500 mb-6 text-center text-sm">確定要登出目前的家庭嗎？<br/>下次需要重新輸入代碼才能登入喔。</p>
              <div className="flex gap-3"><button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition">取消</button><button onClick={confirmLogout} className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200 transition">確定登出</button></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}