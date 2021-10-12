import dynamic from "next/dynamic";
import "antd/dist/antd.dark.css";
import "../styles/globals.css";
export default dynamic(() => import("./dynamic-app"), { ssr: false });
