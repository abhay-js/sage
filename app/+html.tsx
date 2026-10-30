import type {PropsWithChildren} from 'react';
import {ScrollViewStyleReset} from 'expo-router/html';
import {sageColors} from '../lib/theme';
export default function Html({children}:PropsWithChildren){
 return <html lang="en" style={{backgroundColor:sageColors.bg,colorScheme:'light'}}><head>
  <meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
  <meta name="theme-color" content={sageColors.bg}/><ScrollViewStyleReset/>
  <style>{`body{background:${sageColors.bg};margin:0}input,textarea,select{color-scheme:light}`}</style>
 </head><body>{children}</body></html>;
}
