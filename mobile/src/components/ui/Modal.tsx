/**
 * Modal Component
 *
 * Wrapper para modais com overlay e animação.
 * @see frontend/src/components/ui/dialog.tsx
 */

import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Pressable,
} from 'react-native';
import { colors, spacing, radius, typography, shadows, zIndex } from '../../theme/tokens';

export interface ModalProps {
  /** Se o modal está visível */
  visible: boolean;
  /** Callback ao fechar */
  onClose: () => void;
  /** Conteúdo do modal */
  children: React.ReactNode;
  /** Título do modal */
  title?: string;
  /** Descrição do modal */
  description?: string;
  /** Se pode fechar clicando no overlay */
  dismissible?: boolean;
  /** Estilo do container */
  containerStyle?: ViewStyle;
  /** Animação */
  animationType?: 'none' | 'slide' | 'fade';
}

export interface ModalHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export interface ModalTitleProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export interface ModalDescriptionProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export interface ModalContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export interface ModalFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Modal completo
 *
 * @example
 * <Modal
 *   visible={showModal}
 *   onClose={() => setShowModal(false)}
 *   title="Confirmar ação"
 *   description="Tem certeza que deseja continuar?"
 * >
 *   <ModalFooter>
 *     <Button variant="outline" onPress={handleCancel}>Cancelar</Button>
 *     <Button onPress={handleConfirm}>Confirmar</Button>
 *   </ModalFooter>
 * </Modal>
 */
export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  children,
  title,
  description,
  dismissible = true,
  containerStyle,
  animationType = 'fade',
}) => {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissible ? onClose : undefined}
        />

        {/* Content */}
        <View style={[styles.container, containerStyle]}>
          {(title || description) && (
            <ModalHeader>
              {title && <ModalTitle>{title}</ModalTitle>}
              {description && <ModalDescription>{description}</ModalDescription>}
            </ModalHeader>
          )}
          {children}
        </View>
      </View>
    </RNModal>
  );
};

/**
 * Header do Modal
 */
export const ModalHeader: React.FC<ModalHeaderProps> = ({ children, style }) => (
  <View style={[styles.header, style]}>{children}</View>
);

/**
 * Título do Modal
 */
export const ModalTitle: React.FC<ModalTitleProps> = ({ children, style }) => (
  <Text style={[styles.title, style]}>{children}</Text>
);

/**
 * Descrição do Modal
 */
export const ModalDescription: React.FC<ModalDescriptionProps> = ({ children, style }) => (
  <Text style={[styles.description, style]}>{children}</Text>
);

/**
 * Conteúdo do Modal
 */
export const ModalContent: React.FC<ModalContentProps> = ({ children, style }) => (
  <View style={[styles.content, style]}>{children}</View>
);

/**
 * Footer do Modal (botões de ação)
 */
export const ModalFooter: React.FC<ModalFooterProps> = ({ children, style }) => (
  <View style={[styles.footer, style]}>{children}</View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
  },

  container: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    width: '100%',
    maxWidth: 400,
    ...shadows.xl,
  },

  header: {
    padding: spacing[6],
    paddingBottom: spacing[2],
    gap: spacing[1.5],
  },

  title: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.semibold,
    color: colors.foreground,
    textAlign: 'center',
  },

  description: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.sans,
    color: colors.muted.foreground,
    textAlign: 'center',
    lineHeight: typography.sizes.sm * typography.lineHeights.relaxed,
  },

  content: {
    padding: spacing[6],
    paddingTop: spacing[4],
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    padding: spacing[6],
    paddingTop: spacing[4],
  },
});

export default Modal;
