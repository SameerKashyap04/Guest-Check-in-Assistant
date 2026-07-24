import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      dashboard: 'Dashboard',
      rooms: 'Rooms',
      checkin: 'Check-in',
      settings: 'Settings',
    }
  },
  hi: {
    translation: {
      dashboard: 'डैशबोर्ड',
      rooms: 'कमरे',
      checkin: 'चेक-इन',
      settings: 'सेटिंग्स',
    }
  },
  as: {
    translation: {
      dashboard: 'ডেশবৰ্ড',
      rooms: 'কোঠা',
      checkin: 'চেক-ইন',
      settings: 'ছেটিংছ',
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, 
    }
  });

export default i18n;
