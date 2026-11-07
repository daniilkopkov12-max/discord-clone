import React, { createContext, useContext, useState } from 'react';
import { Server, Channel, User } from '../types';

export type ModalType =
  | 'createServer'
  | 'joinServer'
  | 'serverSettings'
  | 'createChannel'
  | 'channelSettings'
  | 'userSettings'
  | 'globalSearch'
  | 'userProfile';

interface ModalData {
  server?: Server;
  channel?: Channel;
  category?: { id: string; name: string };
  user?: User;
  userId?: string;
  channelType?: 'TEXT' | 'VOICE';
}

interface ModalContextType {
  activeModal: ModalType | null;
  modalData: ModalData;
  openModal: (type: ModalType, data?: ModalData) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeModal, setActiveModal] = useState<ModalType | null>(null);
  const [modalData, setModalData] = useState<ModalData>({});

  const openModal = (type: ModalType, data: ModalData = {}) => {
    setActiveModal(type);
    setModalData(data);
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalData({});
  };

  return (
    <ModalContext.Provider
      value={{
        activeModal,
        modalData,
        openModal,
        closeModal,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) throw new Error('useModal must be used within a ModalProvider');
  return context;
}
