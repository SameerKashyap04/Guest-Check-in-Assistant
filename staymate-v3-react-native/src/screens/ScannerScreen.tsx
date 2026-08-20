import React, {useState} from 'react';
import {ScrollView, View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {C, R} from '../theme/tokens';
import {Icon, IconName} from '../components/Icon';
import {PrimaryButton, SecondaryButton} from '../components/Ui';

type DocId = 'auto' | 'aadhaar' | 'pan' | 'voter' | 'dl' | 'passport';
type DocType = {id: DocId; label: string; icon: IconName};

const DOC_TYPES: DocType[] = [
  {id: 'auto', label: 'Auto-detect', icon: 'search'},
  {id: 'aadhaar', label: 'Aadhaar', icon: 'aadhaar'},
  {id: 'pan', label: 'PAN Card', icon: 'pan'},
  {id: 'voter', label: 'Voter ID', icon: 'voter'},
  {id: 'dl', label: 'Driving Licence', icon: 'dl'},
  {id: 'passport', label: 'Passport', icon: 'passport'},
];

export function ScannerScreen({
  onManual,
  onVerify,
  onWeb,
}: {
  onManual: () => void;
  onVerify: () => void;
  onWeb: () => void;
}) {
  const [doc, setDoc] = useState<DocId>('auto');

  const renderCard = (t: DocType) => {
    const active = doc === t.id;
    return (
      <TouchableOpacity
        key={t.id}
        activeOpacity={0.75}
        onPress={() => setDoc(t.id)}
        style={[s.docCard, active && s.docCardActive]}
      >
        <Icon
          name={t.icon}
          size={21}
          color={active ? C.ink : '#6a6a6a'}
          strokeWidth={1.8}
        />
        <Text
          style={[s.docLabel, active && s.docLabelActive]}
          numberOfLines={2}
        >
          {t.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: '#fff'}}
      contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 126}}
      showsVerticalScrollIndicator={false}
    >
      {/* Page header */}
      <View style={{paddingTop: 18}}>
        <Text style={s.h1}>Check-in</Text>
        <Text style={s.sub}>Scan an ID to auto-fill guest details, or enter manually</Text>
      </View>

      {/* DOCUMENT TYPE section header */}
      <Text style={s.sectionLabel}>DOCUMENT TYPE</Text>

      {/* Document Type Cards — 2 rows of 3 equal sized cards matching web view & ss */}
      <View style={s.docGridContainer}>
        <View style={s.docRow}>
          {DOC_TYPES.slice(0, 3).map(renderCard)}
        </View>
        <View style={[s.docRow, {marginTop: 8}]}>
          {DOC_TYPES.slice(3, 6).map(renderCard)}
        </View>
      </View>

      {/* SCAN DOCUMENT label */}
      <Text style={[s.sectionLabel, {marginTop: 22}]}>SCAN DOCUMENT</Text>

      {/* Viewfinder */}
      <View style={s.viewfinder}>
        {/* Dashed frame */}
        <View style={s.dashedFrame}/>
        {/* Corner brackets */}
        <View style={[s.corner, {top: '12%', left: '12%', borderRightWidth: 0, borderBottomWidth: 0}]}/>
        <View style={[s.corner, {top: '12%', right: '12%', borderLeftWidth: 0, borderBottomWidth: 0}]}/>
        <View style={[s.corner, {bottom: '18%', left: '12%', borderRightWidth: 0, borderTopWidth: 0}]}/>
        <View style={[s.corner, {bottom: '18%', right: '12%', borderLeftWidth: 0, borderTopWidth: 0}]}/>

        {/* Top controls */}
        <View style={s.camTop}>
          <View style={s.camBtn}><Icon name="flashOff" size={18} color="#fff"/></View>
          <View style={s.camBtn}><Icon name="flip" size={18} color="#fff"/></View>
        </View>

        {/* Align hint */}
        <Text style={s.alignHint}>Align the document within the frame</Text>

        {/* Bottom controls */}
        <View style={s.camBottom}>
          <View style={s.camBtn}><Icon name="image" size={18} color="#fff"/></View>
          <TouchableOpacity onPress={onVerify} style={s.shutter}/>
          <View style={{width: 42}}/>
        </View>
      </View>

      {/* OR divider */}
      <View style={s.orRow}>
        <View style={s.orLine}/>
        <Text style={s.orText}>OR</Text>
        <View style={s.orLine}/>
      </View>

      <SecondaryButton label="Enter details manually" icon="edit" onPress={onManual}/>

      {/* Web self check-ins card */}
      <TouchableOpacity style={s.webCard} activeOpacity={0.8} onPress={onWeb}>
        <View style={s.webCardRow}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0}}>
            <View style={s.webIcon}><Icon name="qr" size={17} color={C.ink}/></View>
            <View style={{flex: 1}}>
              <Text style={s.webTitle}>Web self check-ins</Text>
              <Text style={s.webSub}>2 pending · share QR or link with guests</Text>
            </View>
          </View>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
            <Icon name="share" size={16} color={C.muted}/>
            <Icon name="chevronRight" size={18} color={C.muted}/>
          </View>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  // Typography
  h1: {
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: '#222222',
    lineHeight: 27,
  },
  sub: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '400',
    color: '#6a6a6a',
    marginTop: 4,
    lineHeight: 19,
  },

  // Section label — matches app.html .caption style exactly
  sectionLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#6a6a6a',
    marginTop: 20,
    marginBottom: 10,
    textTransform: 'uppercase',
  },

  // Doc type grid container — 2 rows of 3 equal columns
  docGridContainer: {
    width: '100%',
  },
  docRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },

  // Exactly equal sized doc-type cards matching web view & ss
  docCard: {
    flex: 1,
    height: 84,
    minHeight: 84,
    borderWidth: 1.5,
    borderColor: '#dddddd',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
  },

  // active state
  docCardActive: {
    borderColor: '#222222',
    backgroundColor: '#F8F7FB',
  },

  // label style
  docLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '500',
    color: '#6a6a6a',
    textAlign: 'center',
    lineHeight: 15,
  },

  // active label
  docLabelActive: {
    color: '#222222',
    fontWeight: '700',
  },

  // Viewfinder
  viewfinder: {
    aspectRatio: 3 / 4,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#2D3239',
    position: 'relative',
  },
  dashedFrame: {
    position: 'absolute',
    top: '12%',
    left: '12%',
    right: '12%',
    bottom: '18%',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 14,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  camTop: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  camBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alignHint: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
  },
  camBottom: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  shutter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffffff',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
  },

  // OR divider
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    marginBottom: 14,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ebebeb',
  },
  orText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '500',
    color: '#6a6a6a',
  },

  // Web self check-ins card
  webCard: {
    marginTop: 20,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ebebeb',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
  },
  webCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  webIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '500',
    color: '#222222',
  },
  webSub: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '400',
    color: '#6a6a6a',
    marginTop: 3,
  },
});
