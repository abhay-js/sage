import {memo,useId,useMemo} from 'react';
import {SvgXml} from 'react-native-svg';
import type {AvatarAppearance} from '../../lib/avatarBuilder';
import {avatarBuilderSvg} from '../../lib/avatarBuilderSvg';
export const BitmojiAvatar=memo(function BitmojiAvatar({appearance,size=124,crop='full',height,pose}:{appearance:AvatarAppearance;size?:number;crop?:'head'|'full';height?:number;pose?:AvatarAppearance['pose']}){
 const id=useId(),xml=useMemo(()=>avatarBuilderSvg(appearance,{size,crop,id,pose}),[appearance,size,crop,id,pose]);
 return <SvgXml xml={xml} width={size} height={height??(crop==='head'?size:size*2)}/>;
});
