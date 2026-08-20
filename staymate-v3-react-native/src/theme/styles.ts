import {StyleSheet} from 'react-native';
import {C,R,S,shadow,fonts} from './tokens';

export const styles=StyleSheet.create({
  screen:{flex:1,backgroundColor:C.canvas},
  scroll:{paddingHorizontal:20,paddingBottom:128},
  displayLg:{fontFamily:fonts.family,fontSize:22,fontWeight:'600',letterSpacing:-.4,lineHeight:27,color:C.ink},
  displayMd:{fontFamily:fonts.family,fontSize:20,fontWeight:'700',lineHeight:25,color:C.ink},
  titleMd:{fontFamily:fonts.family,fontSize:16,fontWeight:'600',color:C.ink},
  titleSm:{fontFamily:fonts.family,fontSize:15,fontWeight:'500',color:C.ink},
  bodyMd:{fontFamily:fonts.family,fontSize:15,fontWeight:'400',lineHeight:22.5,color:C.body},
  bodySm:{fontFamily:fonts.family,fontSize:13.5,fontWeight:'400',lineHeight:19,color:C.muted},
  caption:{fontFamily:fonts.family,fontSize:12.5,fontWeight:'500',color:C.muted},
  micro:{fontFamily:fonts.family,fontSize:11,fontWeight:'700',letterSpacing:.2,color:C.muted},
  sectionLabel:{fontFamily:fonts.family,fontSize:12.5,fontWeight:'700',letterSpacing:.5,color:C.muted,textTransform:'uppercase',marginTop:20,marginBottom:8},
  row:{flexDirection:'row',alignItems:'center'},
  between:{justifyContent:'space-between'},
  card:{backgroundColor:C.canvas,borderWidth:1,borderColor:C.hairlineSoft,borderRadius:R.md,...shadow},
  btn:{height:50,borderRadius:R.sm,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8},
  btnPrimary:{backgroundColor:C.primary},
  btnSecondary:{backgroundColor:'#fff',borderWidth:1,borderColor:C.ink},
  btnSoft:{backgroundColor:C.surfaceStrong},
  chip:{borderWidth:1,borderColor:C.hairline,borderRadius:R.full,paddingHorizontal:12,paddingVertical:7,backgroundColor:'#fff'},
  chipActive:{backgroundColor:C.ink,borderColor:C.ink},
});
