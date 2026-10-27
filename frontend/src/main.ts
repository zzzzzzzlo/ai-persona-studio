import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { reportError } from './lib/errors'
import './style.css'
const app = createApp(App)
app.config.errorHandler = reportError
router.onError(reportError)
window.addEventListener('unhandledrejection', event => { reportError(event.reason); event.preventDefault() })
app.use(router).mount('#app')
