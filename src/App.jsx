const { useState, useEffect } = React;
const { Book, Moon, Sun, User, Bell, Menu, X, ChevronRight, Award, BookOpen, BarChart, Users, Settings, LogOut } = lucide;

// 模拟经文数据
const mockVerses = [
  {
    id: 1,
    reference: 'John 3:16',
    english: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
    chinese: '神爱世人，甚至将他的独生子赐给他们，叫一切信他的，不至灭亡，反得永生。'
  },
  {
    id: 2,
    reference: 'Philippians 4:13',
    english: 'I can do all things through Christ who strengthens me.',
    chinese: '我靠着那加给我力量的，凡事都能做。'
  },
  {
    id: 3,
    reference: 'Proverbs 3:5-6',
    english: 'Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.',
    chinese: '你要专心仰赖耶和华，不可倚靠自己的聪明，在你一切所行的事上都要认定他，他必指引你的路。'
  }
];

// 模拟用户数据
const mockUser = {
  name: 'John Doe',
  role: 'Student',
  progress: 75
};

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('memorization');
  const [verses, setVerses] = useState(mockVerses);
  const [selectedVerse, setSelectedVerse] = useState(null);
  const [viewMode, setViewMode] = useState('parallel'); // parallel, first-letter, fill-in
  const [languageMode, setLanguageMode] = useState('bilingual'); // english, chinese, bilingual

  // 切换深色模式
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // 切换侧边栏
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // 选择经文
  const handleVerseSelect = (verse) => {
    setSelectedVerse(verse);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-800'}`}>
      {/* 顶部导航栏 */}
      <header className={`sticky top-0 z-50 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button 
              onClick={toggleSidebar} 
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center space-x-2">
              <Book className="text-primary" size={24} />
              <h1 className="text-xl font-bold font-rye">Bible Bee</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={toggleDarkMode} 
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
              <Bell size={20} />
            </button>
            <div className="relative">
              <button className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                  <User size={16} />
                </div>
                <span className="hidden md:inline">{mockUser.name}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* 侧边栏 */}
        <aside 
          className={`fixed inset-y-0 left-0 z-40 w-64 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg md:relative md:translate-x-0`}
        >
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="font-medium">{mockUser.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{mockUser.role}</p>
                </div>
              </div>
            </div>
            
            <nav className="flex-1 p-4">
              <ul className="space-y-2">
                <li>
                  <button 
                    onClick={() => setActiveTab('memorization')}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md ${activeTab === 'memorization' ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    <BookOpen size={18} />
                    <span>智能背诵中心</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('study')}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md ${activeTab === 'study' ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    <Book size={18} />
                    <span>深度研读模块</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('tracking')}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md ${activeTab === 'tracking' ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    <BarChart size={18} />
                    <span>进度与管理</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('family')}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md ${activeTab === 'family' ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    <Users size={18} />
                    <span>家庭排行榜</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('settings')}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md ${activeTab === 'settings' ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    <Settings size={18} />
                    <span>设置</span>
                  </button>
                </li>
              </ul>
            </nav>
            
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500">
                <LogOut size={18} />
                <span>退出登录</span>
              </button>
            </div>
          </div>
        </aside>

        {/* 主内容区 */}
        <main className="flex-1 md:ml-64 p-4 md:p-6">
          {/* 背诵中心 */}
          {activeTab === 'memorization' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                <div>
                  <h2 className="text-2xl font-bold font-playfair">智能背诵中心</h2>
                  <p className="text-gray-600 dark:text-gray-400">从初学��精通的渐进式背诵体验</p>
                </div>
                <div className="flex space-x-2">
                  <button className="btn-primary">添加经文</button>
                  <button className="btn-secondary">本周计划</button>
                </div>
              </div>

              {/* 模式切换 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                  <div>
                    <h3 className="font-medium mb-2">背诵模式</h3>
                    <div className="flex space-x-2">
                      {['parallel', 'first-letter', 'fill-in'].map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setViewMode(mode)}
                          className={`px-3 py-1 rounded-md text-sm ${viewMode === mode ? 'bg-primary text-white' : 'border border-gray-300 dark:border-gray-600'}`}
                        >
                          {mode === 'parallel' && '对照模式'}
                          {mode === 'first-letter' && '首字母模式'}
                          {mode === 'fill-in' && '挖空模式'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">语言模式</h3>
                    <div className="flex space-x-2">
                      {['english', 'chinese', 'bilingual'].map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setLanguageMode(mode)}
                          className={`px-3 py-1 rounded-md text-sm ${languageMode === mode ? 'bg-primary text-white' : 'border border-gray-300 dark:border-gray-600'}`}
                        >
                          {mode === 'english' && '纯英'}
                          {mode === 'chinese' && '纯中'}
                          {mode === 'bilingual' && '双语'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 经文卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {verses.map((verse) => (
                  <div 
                    key={verse.id}
                    className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 cursor-pointer card-hover ${selectedVerse?.id === verse.id ? 'border-2 border-primary' : 'border border-gray-200 dark:border-gray-700'}`}
                    onClick={() => handleVerseSelect(verse)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-primary">{verse.reference}</h4>
                      <div className="flex space-x-2">
                        <button className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                    
                    {languageMode === 'bilingual' && viewMode === 'parallel' && (
                      <div className="space-y-3">
                        <div className="font-playfair text-sm text-gray-600 dark:text-gray-400">
                          {verse.english}
                        </div>
                        <div className="font-playfair text-sm text-gray-600 dark:text-gray-400">
                          {verse.chinese}
                        </div>
                      </div>
                    )}
                    
                    {languageMode === 'english' && viewMode === 'first-letter' && (
                      <div className="font-playfair text-sm text-gray-600 dark:text-gray-400">
                        {verse.english.split(' ').map((word, index) => (
                          <span key={index} className="mr-1">
                            {word.charAt(0)}...
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {languageMode === 'chinese' && viewMode === 'fill-in' && (
                      <div className="font-playfair text-sm text-gray-600 dark:text-gray-400">
                        {verse.chinese.split('').map((char, index) => (
                          <span key={index} className={`mr-1 ${index % 3 === 0 ? 'bg-gray-100 dark:bg-gray-700 px-1 rounded' : ''}`}>
                            {index % 3 === 0 ? '___' : char}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 深度研读 */}
          {activeTab === 'study' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                <div>
                  <h2 className="text-2xl font-bold font-playfair">深度研读模块</h2>
                  <p className="text-gray-600 dark:text-gray-400">文本理解与词义联动</p>
                </div>
                <div className="flex space-x-2">
                  <button className="btn-primary">搜索经文</button>
                  <button className="btn-secondary">版本选择</button>
                </div>
              </div>

              {/* 研读区域 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <h3 className="font-medium mb-4">John 3:16</h3>
                <div className="space-y-4">
                  <div className="font-playfair">
                    For <span className="text-primary cursor-pointer hover:underline">God</span> so loved the <span className="text-primary cursor-pointer hover:underline">world</span> that he gave his one and only <span className="text-primary cursor-pointer hover:underline">Son</span>, that whoever believes in him shall not perish but have <span className="text-primary cursor-pointer hover:underline">eternal life</span>.
                  </div>
                  <div className="font-playfair">
                    神爱世人，甚至将他的独生子赐给他们，叫一切信他的，不至灭亡，反得永生。
                  </div>
                </div>
              </div>

              {/* 词义联动 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <h3 className="font-medium mb-4">词义联动</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <div>
                      <h4 className="font-medium">God</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">神</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">造物主，宇宙的创造者</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <div>
                      <h4 className="font-medium">world</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">世人</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">地球上的人类</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <div>
                      <h4 className="font-medium">Son</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">独生子</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">耶稣基督</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <div>
                      <h4 className="font-medium">eternal life</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">永生</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">与神同在的永恒生命</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 进度与管理 */}
          {activeTab === 'tracking' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                <div>
                  <h2 className="text-2xl font-bold font-playfair">进度与管理</h2>
                  <p className="text-gray-600 dark:text-gray-400">基于艾宾浩斯遗忘曲线的记忆算法</p>
                </div>
                <div className="flex space-x-2">
                  <button className="btn-primary">生成报告</button>
                  <button className="btn-secondary">打印卡片</button>
                </div>
              </div>

              {/* 学习进度 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                  <h3 className="font-medium mb-3">本周进度</h3>
                  <div className="flex items-center justify-center">
                    <div className="relative w-32 h-32">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="8"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="#1677ff"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray="283"
                          strokeDashoffset="71"
                          transform="rotate(-90 50 50)"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold">75%</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">3/4 经文已完成</p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                  <h3 className="font-medium mb-3">连续达标</h3>
                  <div className="flex items-center justify-center">
                    <div className="text-4xl font-bold text-primary">7</div>
                  </div>
                  <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">连续学习天数</p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                  <h3 className="font-medium mb-3">总背诵经文</h3>
                  <div className="flex items-center justify-center">
                    <div className="text-4xl font-bold text-primary">24</div>
                  </div>
                  <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">本季度背诵总量</p>
                </div>
              </div>

              {/* 复习计划 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <h3 className="font-medium mb-4">复习计划</h3>
                <div className="space-y-3">
                  {[1, 2, 3].map((day) => (
                    <div key={day} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-md">
                      <div>
                        <h4 className="font-medium">第 {day} 天</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">John 3:16, Philippians 4:13</p>
                      </div>
                      <div className="flex space-x-2">
                        <button className="btn-primary text-sm py-1">开始</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 家庭排行榜 */}
          {activeTab === 'family' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                <div>
                  <h2 className="text-2xl font-bold font-playfair">家庭排行榜</h2>
                  <p className="text-gray-600 dark:text-gray-400">激励互助学习</p>
                </div>
                <div className="flex space-x-2">
                  <button className="btn-primary">刷新</button>
                  <button className="btn-secondary">查看历史</button>
                </div>
              </div>

              {/* 排行榜 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4">排名</th>
                        <th className="text-left py-3 px-4">成员</th>
                        <th className="text-left py-3 px-4">积分</th>
                        <th className="text-left py-3 px-4">本周背诵</th>
                        <th className="text-left py-3 px-4">连续天数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3, 4, 5].map((rank) => (
                        <tr key={rank} className="border-b border-gray-200 dark:border-gray-700">
                          <td className="py-3 px-4 font-medium">{rank}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                                <User size={16} />
                              </div>
                              <span>Family Member {rank}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">{100 - rank * 10}</td>
                          <td className="py-3 px-4">{5 - rank + 1}</td>
                          <td className="py-3 px-4">{7 - rank + 1}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 设置 */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold font-playfair">设置</h2>
                <p className="text-gray-600 dark:text-gray-400">个性化配置</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <h3 className="font-medium mb-4">个人信息</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">姓名</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                      value={mockUser.name}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">角色</label>
                    <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700">
                      <option>Student</option>
                      <option>Teacher</option>
                      <option>Parent</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <h3 className="font-medium mb-4">学习设置</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">默认版本</label>
                    <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700">
                      <option>ESV + CUV</option>
                      <option>NIV + CUV</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">默认背诵模式</label>
                    <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700">
                      <option>对照模式</option>
                      <option>首字母模式</option>
                      <option>挖空模式</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);