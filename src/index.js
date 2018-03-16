import 'jquery'
import 'popper.js'
import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'
import './app.css'
import GalaxyApp from './GalaxyApp'

const app = new GalaxyApp()
app.initData()

if (DEV) {
  console.log(`DEV: Running application version: v${VERSION}`)
  console.log(app)
}
