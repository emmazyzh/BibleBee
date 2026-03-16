import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import './index.css'
import App from './App.jsx'

const rawClerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const clerkPublishableKey = rawClerkPublishableKey
  ? String(rawClerkPublishableKey).replace(/^['"]|['"]$/g, '').trim()
  : ''

const clerkAppearance = {
  elements: {
    rootBox: 'w-full',
    modalContent: 'w-[min(92vw,24rem)] md:w-[24rem] max-w-none',
    cardBox: 'w-full overflow-hidden rounded-2xl bg-white dark:bg-[#161b22] shadow-2xl',
    card: 'bg-transparent shadow-none rounded-none border-0',
    cardContent: 'p-6 md:p-8',
    headerTitle: 'text-xl font-bold text-gray-900 dark:text-white text-center',
    headerSubtitle: 'text-xs text-gray-500 dark:text-gray-400 text-center whitespace-nowrap',
    socialButtonsBlockButton: 'hidden',
    socialButtonsBlockButtonText: 'hidden',
    formFieldLabel: 'hidden',
    formFieldInput: 'w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-primary bg-white dark:bg-[#21262d] border-gray-200 dark:border-[#30363d] text-gray-900 dark:text-white',
    formButtonPrimary: 'w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-blue-600 transition-colors shadow-md',
    footer: 'border-t border-gray-200 dark:border-[#30363d] pt-4 pb-5 px-6 mt-0 bg-white dark:bg-[#161b22]',
    footerAction: 'flex justify-center items-center gap-2',
    footerActionText: 'text-sm text-gray-500 dark:text-gray-400',
    footerActionLink: 'text-primary hover:underline font-medium text-sm',
    footerPages: 'hidden',
    logoBox: 'hidden',
    logoImage: 'hidden',
    dividerLine: 'bg-gray-200 dark:bg-[#30363d]',
    dividerText: 'text-gray-400 dark:text-gray-500 text-sm',
  },
  layout: {
    socialButtonsPlacement: 'bottom',
    showOptionalFields: true,
    logoPlacement: 'none',
  },
  userProfile: {
    elements: {
      modalContent: 'w-[min(96vw,56rem)] md:w-[56rem] max-w-none',
      cardBox: 'w-full overflow-hidden rounded-2xl bg-white dark:bg-[#161b22] shadow-2xl',
      navbar: 'w-[15rem] shrink-0',
      pageScrollBox: 'min-w-0 flex-1',
    },
  },
}

const clerkLocalization = {
  signIn: {
    start: {
      title: '欢迎回来',
      subtitle: '继续您的背诵之旅',
      actionText: '还没有账号？',
      actionLink: '立即注册',
    },
    password: {
      title: '输入密码',
      subtitle: '请输入您的密码继续',
      actionLink: '忘记密码？',
    },
  },
  signUp: {
    start: {
      title: '创建账号',
      subtitle: '开始您的经文背诵之旅',
      actionText: '已有账号？',
      actionLink: '立即登录',
    },
    emailCode: {
      title: '邮箱验证',
      subtitle: '请耐心等待几分钟，您将收到一封包含验证码的邮件',
    },
  },
  userButton: {
    action__manageAccount: '管理账号',
    action__signOut: '退出登录',
    action__signOutAll: '退出所有设备',
    action__addAccount: '添加账号',
    action__openUserMenu: '打开用户菜单',
    action__closeUserMenu: '关闭用户菜单',
  },
  userProfile: {
    mobileButton__menu: '菜单',
    formButtonPrimary__continue: '继续',
    formButtonPrimary__save: '保存',
    formButtonPrimary__finish: '完成',
    formButtonPrimary__remove: '移除',
    formButtonPrimary__add: '添加',
    formButtonReset: '取消',
    navbar: {
      title: '账号',
      description: '管理您的账号信息。',
      account: '账号',
      security: '安全',
      billing: '账单',
      apiKeys: 'API 密钥',
    },
    start: {
      headerTitle__account: '账号信息',
      headerTitle__security: '安全设置',
      profileSection: {
        title: '个人资料',
        primaryButton: '更新资料',
      },
      usernameSection: {
        title: '用户名',
        primaryButton__updateUsername: '更新用户名',
        primaryButton__setUsername: '设置用户名',
      },
      emailAddressesSection: {
        title: '邮箱地址',
        primaryButton: '添加邮箱地址',
        detailsAction__primary: '主要邮箱',
        detailsAction__nonPrimary: '设为主要邮箱',
        detailsAction__unverified: '验证邮箱',
        destructiveAction: '删除',
      },
      phoneNumbersSection: {
        title: '手机号码',
        primaryButton: '添加手机号码',
        detailsAction__primary: '主要号码',
        detailsAction__nonPrimary: '设为主要号码',
        detailsAction__unverified: '验证号码',
        destructiveAction: '删除',
      },
      passwordSection: {
        title: '密码',
        primaryButton__updatePassword: '更新密码',
        primaryButton__setPassword: '设置密码',
      },
      passkeysSection: {
        title: '通行密钥',
        primaryButton: '添加通行密钥',
        menuAction__rename: '重命名',
        menuAction__destructive: '删除',
      },
      mfaSection: {
        title: '双重验证',
        primaryButton: '开启双重验证',
      },
      activeDevicesSection: {
        title: '已登录设备',
        destructiveAction: '退出设备',
      },
      dangerSection: {
        title: '危险操作',
        deleteAccountButton: '删除账号',
      },
    },
    profilePage: {
      title: '个人资料',
      imageFormTitle: '头像',
      imageFormSubtitle: '上传新的头像图片。',
      imageFormDestructiveActionSubtitle: '移除当前头像。',
      fileDropAreaHint: '拖拽图片到这里，或点击上传',
      readonly: '只读',
      successMessage: '个人资料已更新',
    },
    emailAddressPage: {
      title: '邮箱地址',
      verifyTitle: '验证邮箱地址',
    },
  },
  socialButtonsBlockButton: '使用 {{provider}} 登录',
  dividerText: '或',
  formFieldLabel__emailAddress: '',
  formFieldLabel__password: '',
  formFieldInputPlaceholder__emailAddress: '输入邮箱',
  formFieldInputPlaceholder__password: '输入密码',
  formButtonPrimary: '继续',
}

const root = createRoot(document.getElementById('root'))

if (!clerkPublishableKey) {
  root.render(
    <StrictMode>
      <div style={{ padding: '24px', fontFamily: 'Inter, sans-serif', color: '#b91c1c' }}>
        Missing <code>VITE_CLERK_PUBLISHABLE_KEY</code>. Check your local env file and restart the dev server.
      </div>
    </StrictMode>,
  )
} else {
  root.render(
    <StrictMode>
      <ClerkProvider
        publishableKey={clerkPublishableKey}
        afterSignOutUrl="/"
        appearance={clerkAppearance}
        localization={clerkLocalization}
      >
        <App />
      </ClerkProvider>
    </StrictMode>,
  )
}
