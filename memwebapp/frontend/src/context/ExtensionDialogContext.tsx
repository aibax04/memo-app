import React, { createContext, useContext, useState } from 'react';

interface ExtensionDialogContextValue {
    isOpen: boolean;
    openDialog: () => void;
    setIsOpen: (open: boolean) => void;
}

const ExtensionDialogContext = createContext<ExtensionDialogContextValue | undefined>(undefined);

export const ExtensionDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <ExtensionDialogContext.Provider value={{ isOpen, openDialog: () => setIsOpen(true), setIsOpen }}>
            {children}
        </ExtensionDialogContext.Provider>
    );
};

export function useExtensionDialog() {
    const ctx = useContext(ExtensionDialogContext);
    if (!ctx) {
        throw new Error('useExtensionDialog must be used within an ExtensionDialogProvider');
    }
    return ctx;
}
