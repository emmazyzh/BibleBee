import { useState, useEffect, useRef } from 'react'
import { Show, useClerk, useUser } from '@clerk/react'
import './App.css'

// 所有可用经文数据
const allVerses = [
  { id: 1, reference: 'John 3:16', referenceCN: '约翰福音 3:16', english: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.', chinese: '神爱世人，甚至将他的独生子赐给他们，叫一切信他的，不至灭亡，反得永生。', keywords: ['神爱世人', '独生子', '不至灭亡', '反得永生'] },
  { id: 2, reference: 'Philippians 4:13', referenceCN: '腓立比书 4:13', english: 'I can do all things through Christ who strengthens me.', chinese: '我靠着那加给我力量的，凡事都能做。', keywords: ['靠着', '加给我力量', '凡事都能做'] },
  { id: 3, reference: 'Proverbs 3:5-6', referenceCN: '箴言 3:5-6', english: 'Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.', chinese: '你要专心仰赖耶和华，不可倚靠自己的聪明，在你一切所行的事上都要认定他，他必指引你的路。', keywords: ['专心仰赖', '耶和华', '不可倚靠', '认定他', '指引你的路'] },
  { id: 4, reference: 'Psalm 23:1', referenceCN: '诗篇 23:1', english: 'The Lord is my shepherd, I lack nothing.', chinese: '耶和华是我的牧者，我必不至缺乏。', keywords: ['耶和华', '我的牧者', '不至缺乏'] },
  { id: 5, reference: 'Romans 8:28', referenceCN: '罗马书 8:28', english: 'And we know that in all things God works for the good of those who love him.', chinese: '我们晓得万事都互相效力，叫爱神的人得益处。', keywords: ['万事', '互相效力', '爱神的人', '得益处'] },
  { id: 6, reference: 'Isaiah 40:31', referenceCN: '以赛亚书 40:31', english: 'But those who hope in the Lord will renew their strength.', chinese: '但那等候耶和华的必从新得力。', keywords: ['等候耶和华', '从新得力'] },
  { id: 7, reference: 'Jeremiah 29:11', referenceCN: '耶利米书 29:11', english: 'For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you, plans to give you hope and a future.', chinese: '耶和华说：我知道我向你们所怀的意念是赐平安的意念，不是降灾祸的意念，要叫你们末后有指望。', keywords: ['赐平安', '末后有指望'] },
  { id: 8, reference: 'Matthew 11:28', referenceCN: '马太福音 11:28', english: 'Come to me, all you who are weary and burdened, and I will give you rest.', chinese: '凡劳苦担重担的人可以到我这里来，我就使你们得安息。', keywords: ['劳苦担重担', '得安息'] },
  { id: 9, reference: 'Psalm 46:1', referenceCN: '诗篇 46:1', english: 'God is our refuge and strength, an ever-present help in trouble.', chinese: '神是我们的避难所，是我们的力量，是我们在患难中随时的帮助。', keywords: ['避难所', '力量', '随时的帮助'] },
  { id: 10, reference: 'Mark 13:10', referenceCN: '马可福音 13:10', english: 'And the gospel must first be preached to all nations.', chinese: '然而，福音必须先传给万民。', keywords: ['福音', '传给万民'] },
  { id: 11, reference: 'Romans 1:16', referenceCN: '罗马书 1:16', english: 'For I am not ashamed of the gospel, because it is the power of God that brings salvation to everyone who believes: first to the Jew, then to the Gentile.', chinese: '我不以福音为耻；这福音本是神的大能，要救一切相信的，先是犹太人，后是希腊人。', keywords: ['不以福音为耻', '神的大能', '救一切相信的'] },
];

// 经文列表集合
const verseCollections = [
  { id: 'grace', name: '关于恩典的经文', description: '精选关于神恩典的10节经文', count: 10, verses: [1, 2, 3, 4, 5], color: 'from-pink-500 to-rose-500', icon: '✨' },
  { id: 'faith', name: '关于信心的经文', description: '精选关于信心的12节经文', count: 12, verses: [2, 3, 6, 7, 8], color: 'from-blue-500 to-cyan-500', icon: '💪' },
  { id: 'children50', name: '儿童背经50句', description: '适合儿童背诵的50节经文', count: 50, verses: [1, 2, 3, 4, 5, 6, 7, 8, 9], color: 'from-yellow-400 to-orange-500', icon: '👶' },
  { id: 'hope', name: '关于盼望的经文', description: '在困境中带来盼望的经文', count: 8, verses: [6, 7, 8, 9], color: 'from-green-400 to-emerald-500', icon: '🌟' },
  { id: 'love', name: '关于爱的经文', description: '神的爱与彼此相爱的经文', count: 15, verses: [1, 2, 5], color: 'from-red-400 to-pink-500', icon: '❤️' },
  { id: 'gospel', name: '福音经文', description: '关于福音的大能', count: 2, verses: [10, 11], color: 'from-purple-500 to-indigo-500', icon: '📖' },
];

// 模拟排行榜数据
const leaderboardData = [
  { id: 1, name: 'David Chen', avatar: null, masteredCount: 156 },
  { id: 2, name: 'Sarah Wang', avatar: null, masteredCount: 142 },
  { id: 3, name: 'John Liu', avatar: null, masteredCount: 128 },
  { id: 4, name: 'Emily Zhang', avatar: null, masteredCount: 115 },
  { id: 5, name: 'Michael Li', avatar: null, masteredCount: 98 },
];

// 图标组件
const IconBook = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
);

const IconMoon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
);

const IconSun = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
);

const IconUser = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

const IconMenu = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
);

const IconSearch = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);

const IconChevronLeft = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
);

const IconChevronRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
);

const IconParallel = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
);

const IconFirstLetter = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 18h16"/><path d="M8 18v-8a4 4 0 0 1 8 0v8"/><path d="M12 6V4"/></svg>
);

const IconFillIn = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
);

const IconBookOpen = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
);

const IconBarChart = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>
);

const IconSettings = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
);

const IconLogOut = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
);

const IconStudy = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);

const IconMedal = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
);

const IconCamera = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
);

// 首字母模式组件
function FirstLetterMode({ verse, darkMode }) {
  const [revealedWords, setRevealedWords] = useState(new Set());
  const words = verse.english.split(' ');

  const handleWordClick = (index) => {
    setRevealedWords(prev => new Set([...prev, index]));
  };

  return (
    <div className="text-center">
      <p className="text-2xl leading-relaxed" style={{ fontFamily: 'Playfair Display, serif' }}>
        {words.map((word, index) => {
          const isRevealed = revealedWords.has(index);
          return (
            <span
              key={index}
              className="inline-block mr-3 mb-2 cursor-pointer hover:opacity-80"
              onClick={() => handleWordClick(index)}
            >
              {isRevealed ? (
                <span>{word}</span>
              ) : (
                <>
                  <span className="font-bold">{word.charAt(0).toUpperCase()}</span>
                  <span className="text-gray-400">{word.slice(1).replace(/[a-zA-Z]/g, '_')}</span>
                </>
              )}
            </span>
          );
        })}
      </p>
      <p className="text-sm text-gray-400 mt-8">点击任意空格显示完整单词</p>
    </div>
  );
}

// 挖空模式组件
function FillInMode({ verse, darkMode }) {
  const [revealedKeywords, setRevealedKeywords] = useState(new Set());

  const handleKeywordClick = (keyword) => {
    setRevealedKeywords(prev => new Set([...prev, keyword]));
  };

  const renderText = () => {
    let text = verse.chinese;
    const elements = [];
    let lastIndex = 0;

    const keywordPositions = [];
    verse.keywords.forEach(keyword => {
      let pos = text.indexOf(keyword);
      while (pos !== -1) {
        keywordPositions.push({ pos, length: keyword.length, keyword });
        pos = text.indexOf(keyword, pos + 1);
      }
    });

    keywordPositions.sort((a, b) => a.pos - b.pos);

    const uniquePositions = [];
    keywordPositions.forEach(kp => {
      if (!uniquePositions.some(up => up.pos === kp.pos)) {
        uniquePositions.push(kp);
      }
    });

    uniquePositions.forEach(({ pos, length, keyword }) => {
      if (pos > lastIndex) {
        elements.push(<span key={`text-${pos}`}>{text.slice(lastIndex, pos)}</span>);
      }

      const isRevealed = revealedKeywords.has(keyword);
      elements.push(
        <span
          key={`kw-${pos}`}
          className={`inline-block mx-1 px-2 py-1 rounded cursor-pointer transition-all ${isRevealed
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : 'bg-primary/10 text-primary border-b-2 border-primary min-w-[3em] text-center hover:bg-primary/20'
            }`}
          onClick={() => !isRevealed && handleKeywordClick(keyword)}
        >
          {isRevealed ? keyword : '?'}
        </span>
      );

      lastIndex = pos + length;
    });

    if (lastIndex < text.length) {
      elements.push(<span key={`text-end`}>{text.slice(lastIndex)}</span>);
    }

    return elements;
  };

  return (
    <div className="text-center">
      <p className="text-2xl leading-relaxed" style={{ fontFamily: 'Playfair Display, serif' }}>
        {renderText()}
      </p>
      <p className="text-sm text-gray-400 mt-8">点击问号查看提示</p>
    </div>
  );
}

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('memorization');
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [viewMode, setViewMode] = useState('parallel');
  const [masteredVerses, setMasteredVerses] = useState([
    { id: 1, date: '2024-03-10', reviewCount: 3 },
    { id: 2, date: '2024-03-11', reviewCount: 2 }
  ]);
  const [skippedVerses, setSkippedVerses] = useState([]);
  const [currentVerses, setCurrentVerses] = useState([1, 2, 3]);
  const [showNextGroupModal, setShowNextGroupModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [settings, setSettings] = useState({
    chineseVersion: 'cuv',
    englishVersion: 'esv',
    versesPerGroup: 3
  });
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const [usernameInput, setUsernameInput] = useState('');
  const [savedUsername, setSavedUsername] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const leaderboardPageSize = 10;

  const cardRef = useRef(null);
  const touchStartX = useRef(0);
  const avatarInputRef = useRef(null);
  const accountMenuRef = useRef(null);
  const { signOut, openSignIn, openSignUp } = useClerk();
  const { user, isLoaded: isUserLoaded, isSignedIn } = useUser();

  const getDefaultUsername = (email = '') => {
    const localPart = email.split('@')[0] || 'user';
    const normalized = localPart
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '_')
      .replace(/^[._-]+|[._-]+$/g, '');

    return normalized || 'user';
  };

  const primaryEmail = user?.primaryEmailAddress?.emailAddress || '';
  const displayedAvatar = avatarPreview || user?.imageUrl || '';

  useEffect(() => {
    if (!user) {
      setUsernameInput('');
      setSavedUsername('');
      setAvatarPreview('');
      setSelectedAvatarFile(null);
      setProfileError('');
      setProfileSuccess('');
      return;
    }

    const defaultUsername = user.username || getDefaultUsername(primaryEmail);
    setUsernameInput(defaultUsername);
    setSavedUsername(defaultUsername);
    setAvatarPreview('');
    setSelectedAvatarFile(null);
  }, [user?.id, user?.username, user?.imageUrl, primaryEmail]);

  useEffect(() => {
    if (!user || user.username || !primaryEmail) return;

    const defaultUsername = getDefaultUsername(primaryEmail);
    user.update({ username: defaultUsername }).catch(() => {
      // Keep the UI usable even if the initial default username sync fails.
    });
  }, [user, primaryEmail]);

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenAvatarPicker = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setSelectedAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setProfileError('');
    setProfileSuccess('');
  };

  const handleCancelProfileEdit = () => {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setUsernameInput(savedUsername);
    setSelectedAvatarFile(null);
    setAvatarPreview('');
    setProfileError('');
    setProfileSuccess('');

    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    const trimmedUsername = usernameInput.trim();
    if (!trimmedUsername) {
      setProfileError('用户名不能为空');
      setProfileSuccess('');
      return;
    }

    try {
      setIsSavingProfile(true);
      setProfileError('');
      setProfileSuccess('');

      if (trimmedUsername !== user.username) {
        await user.update({ username: trimmedUsername });
      }

      if (selectedAvatarFile) {
        await user.setProfileImage({ file: selectedAvatarFile });
      }

      setSavedUsername(trimmedUsername);
      setSelectedAvatarFile(null);
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarPreview('');
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
      setProfileSuccess('账号信息已保存');
    } catch (error) {
      setProfileError(error?.errors?.[0]?.longMessage || error?.errors?.[0]?.message || '保存失败，请稍后重试');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleOpenAccountPage = () => {
    setActiveTab('userinfo');
    setSidebarOpen(false);
    setAccountMenuOpen(false);
  };

  const getCurrentVerseList = () => {
    return currentVerses
      .map(id => allVerses.find(v => v.id === id))
      .filter(v => v && !masteredVerses.some(mv => mv.id === v.id));
  };

  const currentVerseList = getCurrentVerseList();
  const currentVerse = currentVerseList[currentVerseIndex];

  const toggleDarkMode = () => setDarkMode(!darkMode);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const goToNextVerse = () => {
    setCurrentVerseIndex((prev) => (prev + 1) % currentVerseList.length);
  };

  const goToPrevVerse = () => {
    setCurrentVerseIndex((prev) => (prev - 1 + currentVerseList.length) % currentVerseList.length);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goToNextVerse();
      else goToPrevVerse();
    }
  };

  const handleMastered = () => {
    if (!currentVerse) return;
    const today = new Date().toISOString().split('T')[0];
    setMasteredVerses([...masteredVerses, { id: currentVerse.id, date: today, reviewCount: 1 }]);
    const remainingVerses = currentVerseList.filter(v => v.id !== currentVerse.id);
    if (remainingVerses.length === 0) {
      setTimeout(() => {
        setShowNextGroupModal(true);
      }, 300);
    } else {
      if (currentVerseIndex >= remainingVerses.length) {
        setCurrentVerseIndex(0);
      }
    }
  };

  const handleNotMastered = () => {
    goToNextVerse();
  };

  const handleSkip = () => {
    if (!currentVerse) return;
    setSkippedVerses([...skippedVerses, currentVerse.id]);
    const remainingVerses = currentVerseList.filter(v => v.id !== currentVerse.id);
    if (remainingVerses.length === 0) {
      setTimeout(() => {
        setShowNextGroupModal(true);
      }, 300);
    } else {
      if (currentVerseIndex >= remainingVerses.length) {
        setCurrentVerseIndex(0);
      }
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setShowSearchResults(true);
      setActiveTab('search');
    }
  };

  const addVerseToList = (verseId) => {
    if (!currentVerses.includes(verseId)) {
      setCurrentVerses([...currentVerses, verseId]);
    }
    setActiveTab('memorization');
    setShowSearchResults(false);
    setSearchQuery('');
  };

  const selectCollection = (collection) => {
    setCurrentVerses(collection.verses.slice(0, settings.versesPerGroup));
    setMasteredVerses([]);
    setSkippedVerses([]);
    setCurrentVerseIndex(0);
    setActiveTab('memorization');
  };

  const startNextGroup = () => {
    const remainingIds = allVerses
      .filter(v => !masteredVerses.some(mv => mv.id === v.id))
      .slice(0, settings.versesPerGroup)
      .map(v => v.id);

    if (remainingIds.length > 0) {
      setCurrentVerses(remainingIds);
      setCurrentVerseIndex(0);
    }
    setShowNextGroupModal(false);
  };

  const searchResults = searchQuery.trim()
    ? allVerses.filter(v =>
      v.chinese.includes(searchQuery) ||
      v.english.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.referenceCN.includes(searchQuery)
    )
    : [];

  // Leaderboard pagination
  const totalLeaderboardPages = Math.ceil(leaderboardData.length / leaderboardPageSize);
  const paginatedLeaderboard = leaderboardData.slice(
    (leaderboardPage - 1) * leaderboardPageSize,
    leaderboardPage * leaderboardPageSize
  );

  const totalMastered = masteredVerses.length;
  const pendingVerses = currentVerses
    .map(id => allVerses.find(v => v.id === id))
    .filter(v => v && !masteredVerses.some(mv => mv.id === v.id) && !skippedVerses.includes(v.id));



  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-[#0d1117] text-gray-100' : 'bg-gray-50 text-gray-800'}`}>
      {/* Header */}
      <header className="sticky top-0 z-50 shadow-sm" style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff' }}>
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button onClick={toggleSidebar} className={`p-2 rounded-md ${darkMode ? 'hover:bg-[#30363d]' : 'hover:bg-gray-100'}`} style={{ color: darkMode ? '#d1d5db' : '#374151' }}>
                <IconMenu />
              </button>
            <button
              onClick={() => setActiveTab('memorization')}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <div className="text-primary"><IconBook /></div>
              <h1 className="text-xl font-bold" style={{ fontFamily: 'Rye, cursive' }}>Bible Bee</h1>
            </button>
          </div>

          {/* 搜索框 */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="搜索我要背的经文，例如：福音"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 rounded-full border focus:outline-none focus:border-primary"
                style={{ backgroundColor: darkMode ? '#21262d' : '#f3f4f6', borderColor: darkMode ? '#30363d' : '#e5e7eb' }}
              />
              <button
                onClick={handleSearch}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                <IconSearch />
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* 排行榜按钮 */}
            <button
              onClick={() => setActiveTab('leaderboard')}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#30363d]"
              style={{ color: darkMode ? '#facc15' : '#eab308' }}
              title="排行榜"
            >
              <IconMedal />
            </button>
            <button onClick={toggleDarkMode} className={`p-2 rounded-full ${darkMode ? 'hover:bg-[#30363d]' : 'hover:bg-gray-100'}`} style={{ color: darkMode ? '#d1d5db' : '#374151' }}>
              {darkMode ? <IconSun /> : <IconMoon />}
            </button>
            {isUserLoaded && isSignedIn ? (
              <div className="relative" ref={accountMenuRef}>
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen(prev => !prev)}
                  className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary/15"
                  style={{ backgroundColor: darkMode ? '#21262d' : '#eff6ff' }}
                >
                  {user?.imageUrl ? (
                    <img src={user.imageUrl} alt="用户头像" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary">
                      <IconUser />
                    </div>
                  )}
                </button>
                {accountMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-44 rounded-2xl shadow-xl border py-2 z-50"
                    style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff', borderColor: darkMode ? '#30363d' : '#e5e7eb' }}
                  >
                    <button
                      type="button"
                      onClick={handleOpenAccountPage}
                      className={`w-full px-4 py-3 text-left text-sm ${darkMode ? 'hover:bg-[#21262d]' : 'hover:bg-gray-50'}`}
                    >
                      账号管理
                    </button>
                    <button
                      type="button"
                      onClick={() => signOut({ redirectUrl: '/' })}
                      className={`w-full px-4 py-3 text-left text-sm text-red-500 ${darkMode ? 'hover:bg-[#21262d]' : 'hover:bg-gray-50'}`}
                    >
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button 
                onClick={() => openSignIn()}
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                登录
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out shadow-lg`} style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff' }}>
          <div className="h-full flex flex-col">
            <div className="p-4 border-b" style={{ borderColor: darkMode ? '#30363d' : '#e5e7eb' }}>
              <Show when="signed-in">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 rounded-full overflow-hidden" style={{ backgroundColor: darkMode ? '#21262d' : '#eff6ff' }}>
                    {user?.imageUrl ? (
                      <img src={user.imageUrl} alt="用户头像" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary">
                        <IconUser />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">{savedUsername || '用户'}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">已背 {totalMastered} 节</p>
                  </div>
                </div>
              </Show>
              <Show when="signed-out">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                    <IconUser />
                  </div>
                  <div>
                    <h3 className="font-medium">访客</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">登录后同步进度</p>
                  </div>
                </div>
              </Show>
            </div>
            <nav className="flex-1 p-4">
              <ul className="space-y-2">
                {[
                  { id: 'memorization', label: '背诵', icon: IconBookOpen },
                  { id: 'study', label: '研读', icon: IconStudy },
                  { id: 'plan', label: '计划', icon: IconBarChart },
                  { id: 'progress', label: '我的', icon: IconUser },
                  { id: 'settings', label: '设置', icon: IconSettings },
                ].map(item => (
                  <li key={item.id}>
                    <button
                      onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${activeTab === item.id ? 'bg-blue-50 text-primary dark:bg-blue-900/30' : darkMode ? 'hover:bg-[#30363d]' : 'hover:bg-gray-100'}`}
                      style={{ color: activeTab === item.id ? '' : (darkMode ? '#d1d5db' : '#374151') }}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-2 md:p-4">
          {activeTab === 'memorization' && (
            <div className="h-[calc(100vh-100px)] flex flex-col">
              <div
                ref={cardRef}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className="flex-1 rounded-2xl shadow-lg p-4 md:p-6 flex flex-col relative"
                style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff' }}
              >
                {currentVerseList.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="text-6xl mb-4">🎉</div>
                    <h3 className="text-2xl font-bold mb-2">恭喜！</h3>
                    <p className="text-gray-500 mb-6">你已经完成了当前组的所有经文</p>
                    <button
                      onClick={() => setShowNextGroupModal(true)}
                      className="px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-blue-600"
                    >
                      开始下一组
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={goToPrevVerse}
                      className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-2 md:p-3 rounded-full transition-all hover:bg-gray-200 shadow-md z-10"
                      style={{ backgroundColor: darkMode ? 'rgba(33, 38, 45, 0.8)' : 'rgba(255, 255, 255, 0.8)' }}
                    >
                      <IconChevronLeft />
                    </button>

                    <button
                      onClick={goToNextVerse}
                      className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-2 md:p-3 rounded-full transition-all hover:bg-gray-200 shadow-md z-10"
                      style={{ backgroundColor: darkMode ? 'rgba(33, 38, 45, 0.8)' : 'rgba(255, 255, 255, 0.8)' }}
                    >
                      <IconChevronRight />
                    </button>

                    <div className="flex justify-center space-x-4 mb-6">
                      {[
                        { key: 'parallel', icon: IconParallel, label: '对照' },
                        { key: 'fill-in', icon: IconFillIn, label: '挖空' },
                        { key: 'first-letter', icon: IconFirstLetter, label: '首字母' }
                      ].map(mode => (
                        <button
                          key={mode.key}
                          onClick={() => setViewMode(mode.key)}
                          className={`flex flex-col items-center p-3 rounded-xl transition-all ${viewMode === mode.key ? 'bg-primary text-white' : darkMode ? 'hover:bg-[#30363d]' : 'hover:bg-gray-100'}`}
                          style={{ color: viewMode === mode.key ? '' : (darkMode ? '#d1d5db' : '#374151') }}
                        >
                          <mode.icon />
                          <span className="text-xs mt-1">{mode.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="text-center mb-4">
                      <h2 className="text-3xl font-bold text-primary mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                        {currentVerse?.referenceCN}
                      </h2>
                      <p className="text-sm text-gray-500" style={{ fontFamily: 'Playfair Display, serif' }}>
                        {currentVerse?.reference}
                      </p>
                    </div>

                    <div className="text-center mb-4">
                      <span className="inline-block px-4 py-1 rounded-full text-sm text-gray-700 dark:text-gray-200" style={{ backgroundColor: darkMode ? '#21262d' : '#f3f4f6' }}>
                        {currentVerseIndex + 1} / {currentVerseList.length}
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col justify-center space-y-6 overflow-y-auto px-6 md:px-20">
                      {viewMode === 'parallel' && (
                        <>
                          <div className="text-center">
                            <p className="text-2xl leading-relaxed font-medium" style={{ fontFamily: 'Playfair Display, serif' }}>
                              {currentVerse?.chinese}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xl leading-relaxed" style={{ fontFamily: 'Playfair Display, serif', color: darkMode ? '#e5e7eb' : '#4b5563' }}>
                              {currentVerse?.english}
                            </p>
                          </div>
                        </>
                      )}

                      {viewMode === 'first-letter' && currentVerse && (
                        <FirstLetterMode verse={currentVerse} darkMode={darkMode} />
                      )}

                      {viewMode === 'fill-in' && currentVerse && (
                        <FillInMode verse={currentVerse} darkMode={darkMode} />
                      )}
                    </div>

                    <div className="text-center mt-4">
                      <button
                        onClick={() => setActiveTab('study')}
                        className="text-sm text-primary hover:underline"
                      >
                        深度研读
                      </button>
                    </div>

                    <div className="flex justify-center items-center space-x-6 mt-6">
                      <button
                        onClick={handleNotMastered}
                        className="px-8 py-3 rounded-full border-2 border-orange-400 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 font-medium transition-all"
                      >
                        不熟
                      </button>
                      <button
                        onClick={handleMastered}
                        className="px-8 py-3 rounded-full bg-green-500 text-white hover:bg-green-600 font-medium transition-all shadow-lg"
                      >
                        会背
                      </button>
                      <button
                        onClick={handleSkip}
                        className="text-sm text-gray-400 hover:text-gray-600 underline"
                      >
                        跳过
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'search' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-gray-500 text-sm">搜索"{searchQuery}"，找到 {searchResults.length} 节经文</p>
                <button
                  onClick={() => { setActiveTab('memorization'); setShowSearchResults(false); }}
                  className="text-primary hover:underline"
                >
                  返回首页
                </button>
              </div>

              <div className="space-y-4 max-w-3xl mx-auto">
                {searchResults.length === 0 ? (
                  <p className="text-gray-500 text-center py-10">未找到匹配的经文</p>
                ) : (
                  searchResults.map(verse => (
                    <div key={verse.id} className="rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow" style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff' }}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-primary">{verse.referenceCN}</h3>
                          <p className="text-sm text-gray-500 mt-1">{verse.reference}</p>
                        </div>
                        <button
                          onClick={() => addVerseToList(verse.id)}
                          className="px-5 py-2 bg-primary text-white rounded-full text-sm hover:bg-blue-600 transition-colors"
                        >
                          加入我的背诵
                        </button>
                      </div>
                      <div className="space-y-3">
                        <p className="text-lg leading-relaxed" style={{ color: darkMode ? '#ffffff' : '#1f2937' }}>{verse.chinese}</p>
                        <p className="italic" style={{ color: darkMode ? '#9ca3af' : '#4b5563' }}>{verse.english}</p>
                      </div>
                      <div className="mt-3 pt-3 border-t" style={{ borderColor: darkMode ? '#30363d' : '#f3f4f6' }}>
                        <span className="text-xs text-gray-400">和合本</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'study' && (
            <div className="space-y-6 pt-4 md:pt-6 max-w-3xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                <div>
                  <p className="text-sm text-gray-400 mt-3">敬畏耶和华是智慧的开端，认识至圣者便是聪明。</p>
                </div>
              </div>

              <div className="w-full rounded-lg shadow-sm p-5 md:p-6 overflow-hidden" style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff' }}>
                <h3 className="font-medium mb-4">{currentVerse?.referenceCN} {currentVerse?.reference}</h3>
                <div className="space-y-4">
                  <div style={{ fontFamily: 'Playfair Display, serif' }} className="text-lg leading-relaxed break-words flex flex-wrap gap-x-1.5 gap-y-2">
                    {currentVerse?.english.split(' ').map((word, i) => (
                      <span key={i} className="text-primary cursor-pointer hover:underline break-words">{word}</span>
                    ))}
                  </div>
                  <div style={{ fontFamily: 'Playfair Display, serif' }} className="text-lg leading-relaxed break-words">
                    {currentVerse?.chinese}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'plan' && (
            <div className="space-y-6 max-w-2xl mx-auto pt-4 md:pt-6">
              <div className="text-center mb-8">
                <p className="text-gray-500 dark:text-gray-300">选择经文列表开始你的背诵之旅</p>
              </div>

              <div className="space-y-4">
                {verseCollections.map((collection, index) => (
                  <div key={collection.id} className="rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all transform hover:scale-[1.02]" style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff' }}>
                    <div className={`h-2 bg-gradient-to-r ${collection.color}`}></div>
                    <div className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="text-4xl">{collection.icon}</div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-xl font-bold">{collection.name}</h3>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${collection.color} text-white`}>
                              {collection.count}节
                            </span>
                          </div>
                          <p className="text-gray-500 dark:text-gray-300 mb-4">{collection.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex space-x-2">
                              {collection.verses.slice(0, 3).map((vId, i) => (
                                <span key={i} className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-gray-500 dark:text-gray-300" style={{ backgroundColor: darkMode ? '#30363d' : '#f3f4f6' }}>
                                  {i + 1}
                                </span>
                              ))}
                              {collection.verses.length > 3 && (
                                <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-gray-500 dark:text-gray-300" style={{ backgroundColor: darkMode ? '#30363d' : '#f3f4f6' }}>
                                  +{collection.verses.length - 3}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => selectCollection(collection)}
                              className={`px-6 py-2 rounded-full text-white font-medium bg-gradient-to-r ${collection.color} hover:shadow-lg transition-all`}
                            >
                              选择此列表
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'userinfo' && (
            <div className="space-y-6 max-w-2xl mx-auto pt-4">
              <Show when="signed-in">
                <div className="rounded-2xl shadow-sm p-6 md:p-8" style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff' }}>
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    <div className="flex items-center gap-4 md:gap-6">
                      <div className="relative w-20 h-20 md:w-24 md:h-24">
                        <div className="w-full h-full rounded-full overflow-hidden ring-4 ring-primary/15" style={{ backgroundColor: darkMode ? '#21262d' : '#eff6ff' }}>
                          {displayedAvatar ? (
                            <img src={displayedAvatar} alt="用户头像" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-primary">
                              <IconUser />
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleOpenAvatarPicker}
                          className="absolute -right-1 bottom-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md border"
                          style={{
                            backgroundColor: darkMode ? '#d1d5db' : '#e5e7eb',
                            borderColor: darkMode ? '#9ca3af' : '#d1d5db',
                            color: '#374151'
                          }}
                          aria-label="更新头像"
                        >
                          <IconCamera />
                        </button>
                      </div>
                    </div>

                    <div className="hidden md:block" />
                  </div>

                  <div className="hidden">
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-5 mt-8">
                    <div>
                      <label className="block text-sm font-medium mb-2">用户名</label>
                      <input
                        type="text"
                        value={usernameInput}
                        onChange={(e) => {
                          setUsernameInput(e.target.value);
                          setProfileError('');
                          setProfileSuccess('');
                        }}
                        className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-primary"
                        style={{ backgroundColor: darkMode ? '#21262d' : '#ffffff', borderColor: darkMode ? '#30363d' : '#d1d5db' }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">邮箱</label>
                      <input
                        type="text"
                        value={primaryEmail}
                        disabled
                        className="w-full px-4 py-3 border rounded-xl opacity-70 cursor-not-allowed"
                        style={{ backgroundColor: darkMode ? '#21262d' : '#f9fafb', borderColor: darkMode ? '#30363d' : '#d1d5db' }}
                      />
                    </div>
                  </div>

                  {(profileError || profileSuccess) && (
                    <div className={`mt-5 text-sm ${profileError ? 'text-red-500' : 'text-green-600'}`}>
                      {profileError || profileSuccess}
                    </div>
                  )}

                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-8">
                    <button
                      type="button"
                      onClick={handleCancelProfileEdit}
                      className="px-5 py-3 rounded-xl border font-medium transition-colors"
                      style={{ borderColor: darkMode ? '#30363d' : '#d1d5db', backgroundColor: darkMode ? '#21262d' : '#ffffff' }}
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile}
                      className="px-5 py-3 rounded-xl bg-primary text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-60"
                    >
                      {isSavingProfile ? '保存中...' : '保存'}
                    </button>
                  </div>

                </div>
              </Show>
              <Show when="signed-out">
                <div className="rounded-2xl shadow-sm p-8 text-center" style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff' }}>
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <IconUser />
                  </div>
                  <h3 className="text-xl font-bold mb-2">访客模式</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">登录后可同步您的背诵进度到云端</p>
                  <button 
                    onClick={() => openSignUp()}
                    className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
                  >
                    登录 / 注册
                  </button>
                </div>
              </Show>
            </div>
          )}

          {activeTab === 'progress' && (
            <div className="space-y-6 max-w-3xl mx-auto pt-4">
              <div className="rounded-2xl shadow-sm p-8 text-center" style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff' }}>
                <p className="dark:text-white mb-2" style={{ color: darkMode ? '#ffffff' : '#4b5563' }}>
                  <Show when="signed-in">用户</Show>
                  <Show when="signed-out">访客</Show>
                  ，你已经背了
                </p>
                <p className="text-6xl font-bold text-primary mb-2">{totalMastered}</p>
                <p className="dark:text-white" style={{ color: darkMode ? '#ffffff' : '#4b5563' }}>节经文</p>
                <Show when="signed-out">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                    登录后可同步进度到云端
                  </p>
                </Show>
              </div>

              <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff' }}>
                <h3 className="text-lg font-bold mb-4 flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  已会背的经文
                </h3>
                {masteredVerses.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">还没有会背的经文</p>
                ) : (
                  <div className="space-y-3">
                    {masteredVerses.map(mv => {
                      const verse = allVerses.find(v => v.id === mv.id);
                      return (
                        <div key={mv.id} className="p-4 rounded-xl" style={{ backgroundColor: darkMode ? '#21262d' : '#f9fafb' }}>
                          <div>
                            <p className="font-bold text-primary">{verse?.referenceCN}</p>
                            <p className="text-sm mt-1" style={{ color: darkMode ? '#ffffff' : '#6b7280' }}>{verse?.chinese}</p>
                            <p className="text-sm mt-1 italic" style={{ color: darkMode ? '#9ca3af' : '#9ca3af' }}>{verse?.english}</p>
                          </div>
                          <div className="mt-3 text-right text-xs text-gray-500 dark:text-gray-300 leading-5">
                            <p className="text-green-600 font-medium">已掌握</p>
                            <p>{mv.date}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff' }}>
                <h3 className="text-lg font-bold mb-4 flex items-center">
                  <span className="w-2 h-2 bg-orange-400 rounded-full mr-2"></span>
                  待背诵的经文
                </h3>
                {pendingVerses.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">没有待背诵的经文</p>
                ) : (
                  <div className="space-y-3">
                    {pendingVerses.map(verse => (
                      <div key={verse.id} className="p-4 rounded-xl" style={{ backgroundColor: darkMode ? '#21262d' : '#f9fafb' }}>
                        <p className="font-bold text-primary">{verse.referenceCN}</p>
                        <p className="text-sm mt-1" style={{ color: darkMode ? '#ffffff' : '#6b7280' }}>{verse.chinese}</p>
                        <p className="text-sm mt-1 italic" style={{ color: darkMode ? '#9ca3af' : '#9ca3af' }}>{verse.english}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div className="space-y-6 max-w-2xl mx-auto pt-4">
              {/* Top 3 Podium */}
              <div className="flex justify-center items-end space-x-4 mb-8 px-4">
                {/* 2nd Place */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold mb-2 shadow-lg border-4" style={{ backgroundColor: darkMode ? '#21262d' : '#ffffff', borderColor: darkMode ? '#30363d' : '#d1d5db' }}>
                    {leaderboardData[1]?.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="w-20 h-24 rounded-t-xl shadow-md flex flex-col items-center justify-end pb-2" style={{ backgroundColor: darkMode ? '#21262d' : '#ffffff' }}>
                    <span className="text-2xl font-bold text-gray-400">2</span>
                    <span className="text-xs text-gray-500 dark:text-gray-300 text-center px-1 truncate w-full">{leaderboardData[1]?.name}</span>
                  </div>
                </div>

                {/* 1st Place */}
                <div className="flex flex-col items-center -mt-4">
                  <div className="text-4xl mb-1">👑</div>
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center text-2xl font-bold mb-2 shadow-xl border-4 border-yellow-200">
                    {leaderboardData[0]?.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="w-24 h-32 rounded-t-xl bg-gradient-to-b from-yellow-100 to-yellow-200 dark:from-yellow-900/40 dark:to-yellow-800/30 shadow-lg flex flex-col items-center justify-end pb-3">
                    <span className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{leaderboardData[0]?.masteredCount}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-300 text-center px-1 truncate w-full">{leaderboardData[0]?.name}</span>
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold mb-2 shadow-lg border-4 border-orange-300 dark:border-orange-500" style={{ backgroundColor: darkMode ? '#21262d' : '#ffffff' }}>
                    {leaderboardData[2]?.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="w-20 h-20 rounded-t-xl shadow-md flex flex-col items-center justify-end pb-2" style={{ backgroundColor: darkMode ? '#21262d' : '#ffffff' }}>
                    <span className="text-2xl font-bold text-orange-400">3</span>
                    <span className="text-xs text-gray-500 dark:text-gray-300 text-center px-1 truncate w-full">{leaderboardData[2]?.name}</span>
                  </div>
                </div>
              </div>

              {/* List */}
              <div className="space-y-3">
                {paginatedLeaderboard.map((item, index) => {
                  const actualIndex = (leaderboardPage - 1) * leaderboardPageSize + index;
                  return (
                    <div key={item.id} className="flex items-center space-x-4 p-4 rounded-xl shadow-md" style={{ backgroundColor: darkMode ? '#21262d' : '#ffffff' }}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        actualIndex === 0 ? 'bg-yellow-400 text-white' :
                          actualIndex === 1 ? 'bg-gray-400 text-white' :
                            actualIndex === 2 ? 'bg-orange-400 text-white' :
                              'text-gray-600 dark:text-gray-300'
                      }`}
                      style={{ backgroundColor: actualIndex < 3 ? undefined : (darkMode ? '#30363d' : '#e5e7eb') }}>
                        {actualIndex + 1}
                      </div>
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                        {item.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-primary">{item.masteredCount}</p>
                        <p className="text-xs text-gray-400 dark:text-white">节经文</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Pagination */}
              {totalLeaderboardPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-6">
                  <button
                    onClick={() => setLeaderboardPage(p => Math.max(1, p - 1))}
                    disabled={leaderboardPage === 1}
                    className="p-2 rounded-lg disabled:opacity-30"
                    style={{ backgroundColor: darkMode ? '#21262d' : '#f3f4f6' }}
                  >
                    <IconChevronLeft />
                  </button>
                  <span className="text-sm">
                    {leaderboardPage} / {totalLeaderboardPages}
                  </span>
                  <button
                    onClick={() => setLeaderboardPage(p => Math.min(totalLeaderboardPages, p + 1))}
                    disabled={leaderboardPage === totalLeaderboardPages}
                    className="p-2 rounded-lg disabled:opacity-30"
                    style={{ backgroundColor: darkMode ? '#21262d' : '#f3f4f6' }}
                  >
                    <IconChevronRight />
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="rounded-xl shadow-sm p-6 space-y-6" style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff' }}>
                <div>
                  <label className="block text-sm font-medium mb-2">中文版本</label>
                  <select
                    value={settings.chineseVersion}
                    onChange={(e) => setSettings({ ...settings, chineseVersion: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl"
                    style={{ backgroundColor: darkMode ? '#21262d' : '#ffffff', borderColor: darkMode ? '#30363d' : '#d1d5db' }}
                  >
                    <option value="cuv">和合本</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">英文版本</label>
                  <select
                    value={settings.englishVersion}
                    onChange={(e) => setSettings({ ...settings, englishVersion: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl"
                    style={{ backgroundColor: darkMode ? '#21262d' : '#ffffff', borderColor: darkMode ? '#30363d' : '#d1d5db' }}
                  >
                    <option value="esv">ESV</option>
                    <option value="niv">NIV</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">每组背诵经文个数</label>
                  <select
                    value={settings.versesPerGroup}
                    onChange={(e) => setSettings({ ...settings, versesPerGroup: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border rounded-xl"
                    style={{ backgroundColor: darkMode ? '#21262d' : '#ffffff', borderColor: darkMode ? '#30363d' : '#d1d5db' }}
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={5}>5</option>
                    <option value={7}>7</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 下一组弹窗 */}
      {showNextGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl shadow-xl p-8 max-w-md w-full text-center" style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff' }}>
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold mb-2">太棒了！</h3>
            <p className="text-gray-500 mb-6">你已经完成了当前组的所有经文</p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowNextGroupModal(false)}
                className="flex-1 py-3 rounded-xl font-medium text-gray-700 dark:text-gray-200"
                style={{ backgroundColor: darkMode ? '#30363d' : '#e5e7eb' }}
              >
                稍后继续
              </button>
              <button
                onClick={startNextGroup}
                className="flex-1 py-3 bg-primary text-white rounded-xl font-medium hover:bg-blue-600"
              >
                开始下一组
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App
