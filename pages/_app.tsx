import dynamic from "next/dynamic"
import 'antd/dist/antd.dark.css'; 
export default dynamic(() => import('./dynamic-app'), {ssr: false})
