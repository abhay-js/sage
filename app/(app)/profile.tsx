import {Redirect} from 'expo-router';

/** Legacy profile links resolve to the current You screen. */
export default function ProfileScreen(){return <Redirect href="/(app)/log"/>;}
