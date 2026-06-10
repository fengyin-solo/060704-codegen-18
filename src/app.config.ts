export default defineAppConfig({
  pages: [
    'pages/diary-wall/index',
    'pages/gallery/index',
    'pages/archive/index',
    'pages/mine/index',
    'pages/diary-detail/index',
    'pages/pipeline-editor/index',
    'pages/inventory/index',
    'pages/visit-center/index',
    'pages/login/index'
  ],
  window: {
    backgroundTextStyle: 'dark',
    navigationBarBackgroundColor: '#0a0a0f',
    navigationBarTitleText: '数字腐朽日记',
    navigationBarTextStyle: 'white',
    backgroundColor: '#0a0a0f'
  },
  tabBar: {
    color: '#888888',
    selectedColor: '#39ff14',
    backgroundColor: '#1a1a2e',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/diary-wall/index',
        text: '日记墙'
      },
      {
        pagePath: 'pages/gallery/index',
        text: '展览馆'
      },
      {
        pagePath: 'pages/archive/index',
        text: '档案馆'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的'
      }
    ]
  }
})
