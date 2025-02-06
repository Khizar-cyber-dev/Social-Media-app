// import { getCurrentUser } from '@/lib/appwrite/api';
// import { IContextType, IUser } from '@/types'
// import React, { createContext, ReactNode, useContext, useEffect, useState} from 'react'

// export const INITIAL_USER = {
//     id: '',
//     name: '',
//     username: '',
//     email: '',
//     imageUrl: '',
//     bio: ''
// }

// const INTIAL_STATE = {
//     user: INITIAL_USER,
//     setUser: () => {},
//     isLoading: false,
//     isAuthenticated: false,
//     setIsAuthenticated: () => {},
//     checkAuthUser: async () => false as boolean,
// }

// const AuthContext = createContext<IContextType>(INTIAL_STATE);

// const AuthProvider = ({ children }: { children: React.ReactNode }) => {
//     const [user, setUser] = useState(INITIAL_USER);
//     const [isLoading, setIsLoading] = useState(false);
//     const [isAuthenticated, setIsAuthenticated] = useState(false);

//     const checkAuthUser = async () => {
//         try{
//             const current = await getCurrentUser();
//         } catch(error){
//             console.log(error);
//             return false;
//         } finally {
//             setIsLoading(false)
//         }
//     };

//     const value = {
//         user,
//         setUser,
//         isLoading,
//         isAuthenticated,
//         setIsAuthenticated,
//         checkAuthUser,
//     }
//   return (
//    <AuthContext.Provider value={value}>
//         {children}
//    </AuthContext.Provider>
//   )
// }

// export default AuthProvider

import { useNavigate } from "react-router-dom";
import { createContext, useContext, useEffect, useState } from "react";
import { IUser } from "@/types";
import { getCurrentUser } from "@/lib/appwrite/api";

export const INITIAL_USER = {
  id: "",
  name: "",
  username: "",
  email: "",
  imageUrl: "",
  bio: "",
};

const INITIAL_STATE = {
  user: INITIAL_USER,
  isLoading: false,
  isAuthenticated: false,
  setUser: () => {},
  setIsAuthenticated: () => {},
  checkAuthUser: async () => false as boolean,
};

type IContextType = {
  user: IUser;
  isLoading: boolean;
  setUser: React.Dispatch<React.SetStateAction<IUser>>;
  isAuthenticated: boolean;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
  checkAuthUser: () => Promise<boolean>;
};

const AuthContext = createContext<IContextType>(INITIAL_STATE);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<IUser>(INITIAL_USER);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const checkAuthUser = async () => {
    setIsLoading(true);
    try {
      const currentAccount = await getCurrentUser();
      if (currentAccount) {
        setUser({
          id: currentAccount.$id,
          name: currentAccount.name,
          username: currentAccount.username,
          email: currentAccount.email,
          imageUrl: currentAccount.imageUrl,
          bio: currentAccount.bio,
        });
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      return currentAccount !== null;
    } catch (error) {
      console.error(error);
      setIsAuthenticated(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  

  useEffect(() => {
    //local.storage.getItem('cookieFallback') === null
    if(
      
      localStorage.getItem('cookieFallback') === '[]' ||
      localStorage.getItem('cookieFallback') === null
    ) navigate('/sign-in');

    checkAuthUser();
  }, []);

  const value = {
    user,
    setUser,
    isLoading,
    isAuthenticated,
    setIsAuthenticated,
    checkAuthUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;

export const useUserContext = () => useContext(AuthContext);