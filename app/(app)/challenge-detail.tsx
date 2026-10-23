import { Text,TouchableOpacity } from 'react-native';
import { useLocalSearchParams,useRouter } from 'expo-router';
import { useProductChallenges,useAthleteProfile } from '../../hooks/useProduct';
import { Page,Header,Button,Empty,s } from '../../components/ui/SageUI';
import { Skeleton,form } from '../../components/ui/ProductUI';
import { ChallengeSections,Eligibility } from '../../components/ui/ChallengeContent';
import { challengeState } from '../../lib/productConfig';
import { sageColors as c } from '../../lib/theme';
export default function ChallengeDetail(){const {id}=useLocalSearchParams<{id:string}>(),router=useRouter(),{data,loading,error,refresh}=useProductChallenges(),{data:profile}=useAthleteProfile();const challenge=data?.find(c=>c.id===id);return <Page><Header title={challenge?.name??'Challenge'} eyebrow={challenge?challengeState(challenge):undefined} action={<TouchableOpacity onPress={()=>router.back()}><Text style={{color:c.orange}}>Back</Text></TouchableOpacity>}/>{loading&&!data?<Skeleton/>:error?<><Text style={form.note}>{error}</Text><Button title="Try again" onPress={refresh}/></>:challenge?<><Text style={s.muted}>{challenge.config.challengeType}</Text><Eligibility challenge={challenge} level={profile?.level??null} levels={profile?.levels??[]}/><ChallengeSections challenge={challenge} onRefresh={refresh}/></>:<Empty text="This challenge is unavailable."/>}</Page>;}
