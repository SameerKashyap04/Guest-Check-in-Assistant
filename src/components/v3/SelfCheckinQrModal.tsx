import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Share,
  Platform,
  Linking,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { C, R, shadow } from '@/theme/tokens';
import { Icon } from '@/components/v3/Icon';
import { PrimaryButton, SecondaryButton } from '@/components/v3/Ui';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useRoomsStore } from '@/store/useRoomsStore';

interface SelfCheckinQrModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SelfCheckinQrModal({ visible, onClose }: SelfCheckinQrModalProps) {
  const { businessName, propertyId, getShareableLink } = useSettingsStore();
  const { rooms, fetchRooms } = useRoomsStore();

  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [qrBase64, setQrBase64] = useState<string | null>(null);

  const activePropertyName = businessName || 'My Homestay';
  const activePropertyId = propertyId || 'HS-8821';

  useEffect(() => {
    if (visible) {
      fetchRooms();
      const url = getShareableLink(rooms);
      setShareUrl(url);
      setCopied(false);

      // Generate local QR code base64
      try {
        const qr = require('qrcode');
        qr.toDataURL(
          url,
          { width: 400, margin: 2, color: { dark: '#222222', light: '#FFFFFF' } },
          (err: any, dataUri: string) => {
            if (!err && dataUri) {
              setQrBase64(dataUri);
            }
          }
        );
      } catch (e) {
        console.warn('Local QR generator fallback:', e);
      }
    }
  }, [visible, businessName, propertyId, rooms.length]);

  const qrImageUrl =
    qrBase64 ||
    `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
      shareUrl || 'https://staymate.co.in/self-checkin'
    )}`;

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      Alert.alert('Copy Link', shareUrl);
    }
  };

  const handleShareWhatsApp = async () => {
    const message = `🏡 *Welcome to ${activePropertyName}!*\n\nPlease complete your quick guest registration & check-in online before arrival:\n🔗 ${shareUrl}\n\nWe look forward to hosting you!`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(whatsappUrl, '_blank');
      } else {
        const supported = await Linking.canOpenURL(whatsappUrl);
        if (supported) {
          await Linking.openURL(whatsappUrl);
        } else {
          await Share.share({
            title: `Self Check-in — ${activePropertyName}`,
            message,
            url: shareUrl,
          });
        }
      }
    } catch (e) {
      await Share.share({
        title: `Self Check-in — ${activePropertyName}`,
        message,
        url: shareUrl,
      });
    }
  };

  const handlePrintStandee = async () => {
    try {
      setIsPrinting(true);

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Guest Check-in QR — ${activePropertyName}</title>
          <style>
            @page { size: A4 portrait; margin: 20mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #222222;
              text-align: center;
              padding: 20px;
              margin: 0;
            }
            .container {
              border: 3px solid #7C3AED;
              border-radius: 24px;
              padding: 40px 30px;
              max-width: 600px;
              margin: 0 auto;
              background: #FFFFFF;
            }
            .badge {
              display: inline-block;
              background: #EDE9FE;
              color: #7C3AED;
              font-weight: 700;
              font-size: 14px;
              padding: 6px 16px;
              border-radius: 20px;
              letter-spacing: 0.5px;
              text-transform: uppercase;
              margin-bottom: 12px;
            }
            h1 {
              font-size: 32px;
              font-weight: 800;
              margin: 0 0 8px 0;
              color: #222222;
            }
            .sub {
              font-size: 16px;
              color: #6A6A6A;
              margin: 0 0 30px 0;
            }
            .qr-frame {
              display: inline-block;
              padding: 16px;
              background: #FAF8FD;
              border: 2px dashed #7C3AED;
              border-radius: 20px;
              margin-bottom: 24px;
            }
            .qr-img {
              width: 240px;
              height: 240px;
              display: block;
            }
            .prop-id {
              font-size: 13px;
              font-weight: 700;
              color: #7C3AED;
              margin-top: 10px;
              letter-spacing: 1px;
            }
            .steps {
              display: flex;
              justify-content: space-around;
              margin-top: 30px;
              border-top: 1px solid #ECEAF0;
              padding-top: 24px;
              text-align: center;
            }
            .step-item {
              flex: 1;
              padding: 0 10px;
            }
            .step-num {
              width: 32px;
              height: 32px;
              line-height: 32px;
              border-radius: 50%;
              background: #7C3AED;
              color: #FFFFFF;
              font-weight: 700;
              font-size: 14px;
              margin: 0 auto 8px auto;
            }
            .step-text {
              font-size: 12px;
              font-weight: 600;
              color: #6A6A6A;
            }
            .footer {
              margin-top: 30px;
              font-size: 12px;
              color: #929292;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="badge">Self Check-in Portal</div>
            <h1>${activePropertyName}</h1>
            <p class="sub">Scan with your phone camera to register & check in</p>
            
            <div class="qr-frame">
              <a href="${shareUrl}" target="_blank" style="text-decoration: none;">
                <img class="qr-img" src="${qrImageUrl}" alt="Scan QR Code" />
              </a>
              <div class="prop-id">PROPERTY ID: ${activePropertyId}</div>
            </div>

            <div style="background: #F1F5F9; padding: 10px 16px; border-radius: 12px; font-size: 12px; color: #475569; word-break: break-all; margin: 16px 0 24px 0;">
              <strong>Check-in Link:</strong><br/>
              <a href="${shareUrl}" target="_blank" style="color: #7C3AED; font-weight: 700; text-decoration: underline; word-break: break-all;">${shareUrl}</a>
            </div>

            <div class="steps">
              <div class="step-item">
                <div class="step-num">1</div>
                <div class="step-text">Scan QR with camera</div>
              </div>
              <div class="step-item">
                <div class="step-num">2</div>
                <div class="step-text">Fill details & ID photo</div>
              </div>
              <div class="step-item">
                <div class="step-num">3</div>
                <div class="step-text">Collect your room key</div>
              </div>
            </div>

            <div class="footer">
              Powered by StayMate · Fast & Secure Digital Check-in
            </div>
          </div>
        </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.print();
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            UTI: 'com.adobe.pdf',
            mimeType: 'application/pdf',
            dialogTitle: `${activePropertyName} - Reception QR Standee`,
          });
        } else {
          Alert.alert('Standee Created', 'QR Standee generated successfully!');
        }
      }
    } catch (e: any) {
      console.error('Print standee error', e);
      Alert.alert('Error', e?.message || 'Could not generate standee PDF.');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleOpenPreview = async () => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(shareUrl, '_blank');
      } else {
        const supported = await Linking.canOpenURL(shareUrl);
        if (supported) {
          await Linking.openURL(shareUrl);
        } else {
          onClose();
        }
      }
    } catch (e) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={s.modalOverlay}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation?.()}
          style={s.sheetContent}
        >
          <View style={s.sheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={s.headIcon}>
                <Icon name="qr" size={20} color={C.primary} />
              </View>
              <View>
                <Text style={s.sheetTitle}>Self Check-in QR</Text>
                <Text style={s.sheetSub}>{activePropertyName}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={s.sheetClose}>
              <Icon name="x" size={18} color={C.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {/* QR Visual Box */}
            <View style={s.qrBox}>
              <View style={s.qrBorder}>
                <Image
                  source={{ uri: qrImageUrl }}
                  style={s.qrImg}
                  resizeMode="contain"
                />
              </View>
              <Text style={s.qrPrompt}>
                Guests can scan this QR code with any smartphone camera to check in.
              </Text>
              <View style={s.propertyIdBadge}>
                <Icon name="shield" size={13} color={C.primary} />
                <Text style={s.propertyIdText}>ID: {activePropertyId}</Text>
              </View>
            </View>

            {/* Shareable Link Box */}
            <View style={s.linkBox}>
              <Text style={s.linkLabel}>SHAREABLE WEB LINK</Text>
              <Text style={s.linkText} numberOfLines={2}>
                {shareUrl}
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleCopyLink}
                style={[s.copyBtn, copied && s.copyBtnDone]}
              >
                <Icon
                  name={copied ? 'check' : 'search'}
                  size={14}
                  color={copied ? '#059669' : C.primary}
                />
                <Text
                  style={[s.copyBtnText, copied && { color: '#059669' }]}
                >
                  {copied ? 'Link Copied to Clipboard!' : 'Copy Link'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={s.actionsGrid}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleShareWhatsApp}
                style={s.actionBtnWhatsApp}
              >
                <Icon name="share" size={18} color="#fff" />
                <Text style={s.actionBtnWhatsAppText}>Share via WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handlePrintStandee}
                disabled={isPrinting}
                style={s.actionBtnPrint}
              >
                {isPrinting ? (
                  <ActivityIndicator size="small" color={C.primary} />
                ) : (
                  <>
                    <Icon name="document" size={18} color={C.primary} />
                    <Text style={s.actionBtnPrintText}>
                      Print Reception QR Standee
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleOpenPreview}
                style={s.actionBtnPreview}
              >
                <Icon name="search" size={16} color={C.ink} />
                <Text style={s.actionBtnPreviewText}>
                  Preview Guest Form in Browser
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ECEAF0',
    paddingBottom: 14,
  },
  headIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
  },
  sheetSub: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#6a6a6a',
    marginTop: 1,
  },
  sheetClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrBox: {
    backgroundColor: '#FAF8FD',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ECEAF0',
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  qrBorder: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    ...shadow,
    marginBottom: 14,
  },
  qrImg: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  qrPrompt: {
    fontFamily: 'Inter',
    fontSize: 13,
    lineHeight: 18,
    color: '#6a6a6a',
    textAlign: 'center',
    maxWidth: 280,
  },
  propertyIdBadge: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: R.full,
  },
  propertyIdText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: C.primary,
    letterSpacing: 0.5,
  },
  linkBox: {
    backgroundColor: '#F8F7FB',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ECEAF0',
    marginBottom: 16,
  },
  linkLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#6a6a6a',
    marginBottom: 6,
  },
  linkText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    lineHeight: 18,
    color: '#222222',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  copyBtn: {
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  copyBtnDone: {
    backgroundColor: '#ECFDF3',
  },
  copyBtnText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
  },
  actionsGrid: {
    gap: 10,
  },
  actionBtnWhatsApp: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadow,
  },
  actionBtnWhatsAppText: {
    fontFamily: 'Inter',
    fontSize: 14.5,
    fontWeight: '700',
    color: '#fff',
  },
  actionBtnPrint: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: C.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnPrintText: {
    fontFamily: 'Inter',
    fontSize: 14.5,
    fontWeight: '700',
    color: C.primary,
  },
  actionBtnPreview: {
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnPreviewText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '600',
    color: '#222222',
  },
});
