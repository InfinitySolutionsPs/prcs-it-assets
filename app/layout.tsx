import type {Metadata} from "next";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import "./globals.css";

export const metadata:Metadata={title:"نظام إدارة عهد تكنولوجيا المعلومات",description:"نظام متكامل لإدارة الأصول والعهد التقنية"};

export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}
