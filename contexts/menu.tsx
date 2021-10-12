import { createContext, useContext, useState } from "react";
export interface MenuContextState {
  selectedKeys: string[];
  setSelectedKeys: Function;
}
export const MenuContext = createContext<MenuContextState>(
  { selectedKeys: ["mints"], setSelectedKeys: undefined }
);

export function useMenuState(): MenuContextState  {
  return useContext(MenuContext);
}

export const MenuStateProvider = ({children, selectedKey}) => {
  const [selectedKeys, setSelectedKeys] = useState([selectedKey]);
  console.log(selectedKeys)

  return <MenuContext.Provider value={{selectedKeys, setSelectedKeys}}>
    {children}
  </MenuContext.Provider>
}