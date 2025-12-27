/**
 * useTeamQuery - Hooks para gerenciar membros da equipe
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamService, type TeamMember, type TeamInvite, type TeamStats, type CreateInviteData, type UpdateMemberData } from '@/services/teamService';

/**
 * Hook para buscar todos os membros da equipe
 */
export function useTeamMembers() {
  return useQuery<TeamMember[], Error>({
    queryKey: ['team', 'members'],
    queryFn: () => teamService.getMembers(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para buscar técnicos disponíveis (para atribuição de OS)
 */
export function useTechnicians() {
  return useQuery<TeamMember[], Error>({
    queryKey: ['team', 'technicians'],
    queryFn: () => teamService.getTechnicians(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para buscar estatísticas da equipe
 */
export function useTeamStats() {
  return useQuery<TeamStats, Error>({
    queryKey: ['team', 'stats'],
    queryFn: () => teamService.getStats(),
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

/**
 * Hook para buscar convites pendentes
 */
export function useTeamInvites() {
  return useQuery<TeamInvite[], Error>({
    queryKey: ['team', 'invites'],
    queryFn: () => teamService.getInvites(),
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

/**
 * Hook para atualizar status de um membro
 */
export function useUpdateMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: number; data: UpdateMemberData }) => 
      teamService.updateMember(memberId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'members'] });
      queryClient.invalidateQueries({ queryKey: ['team', 'technicians'] });
      queryClient.invalidateQueries({ queryKey: ['team', 'stats'] });
    },
  });
}

/**
 * Hook para remover um membro
 */
export function useRemoveMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (memberId: number) => teamService.removeMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'members'] });
      queryClient.invalidateQueries({ queryKey: ['team', 'technicians'] });
      queryClient.invalidateQueries({ queryKey: ['team', 'stats'] });
    },
  });
}

/**
 * Hook para criar um convite
 */
export function useCreateInvite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateInviteData) => teamService.createInvite(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'invites'] });
      queryClient.invalidateQueries({ queryKey: ['team', 'stats'] });
    },
  });
}

/**
 * Hook para reenviar um convite
 */
export function useResendInvite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (inviteId: number) => teamService.resendInvite(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'invites'] });
    },
  });
}

/**
 * Hook para revogar um convite
 */
export function useRevokeInvite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (inviteId: number) => teamService.revokeInvite(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'invites'] });
      queryClient.invalidateQueries({ queryKey: ['team', 'stats'] });
    },
  });
}
