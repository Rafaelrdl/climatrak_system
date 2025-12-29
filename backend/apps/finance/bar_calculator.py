"""
BAR Calculator - Budget-at-Risk Calculator

Serviço responsável por:
1. Calcular BAR (Budget-at-Risk) por centro de custo
2. Agregar risk scores de múltiplos ativos
3. Gerar snapshots e relatórios de risco

Fórmula:
BAR = Σ(failure_probability × impact_cost) para todos ativos do centro

Níveis de agregação:
- Por ativo individual
- Por centro de custo
- Por hierarquia de centros

Referências:
- [RSK-001] BAR/Forecast (RiskSnapshot)
"""

import logging
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional, Tuple
from datetime import date, timedelta
from uuid import UUID

from django.db import transaction
from django.db.models import Sum, Avg, Count, Max, Min, F
from django.db.models.functions import TruncMonth

from .models import (
    CostCenter,
    RiskSnapshot,
)

logger = logging.getLogger(__name__)


class BARCalculatorError(Exception):
    """Erro base do BAR Calculator."""
    pass


class BARCalculator:
    """
    Serviço para cálculo de Budget-at-Risk.
    
    Agrega risco financeiro de ativos para suportar decisões
    de manutenção e alocação de orçamento.
    """
    
    @classmethod
    def calculate_bar_for_cost_center(
        cls,
        cost_center: CostCenter,
        snapshot_date: Optional[date] = None,
        include_children: bool = True,
    ) -> Dict[str, Any]:
        """
        Calcula BAR para um centro de custo.
        
        Args:
            cost_center: Centro de custo
            snapshot_date: Data do snapshot (default: último disponível)
            include_children: Incluir centros filhos na hierarquia
            
        Returns:
            Dict com resultado:
            - bar_total: Decimal (BAR total em R$)
            - assets_count: int
            - avg_risk_score: Decimal
            - max_risk_score: Decimal
            - breakdown_by_level: dict (por nível de risco)
            - top_risks: list (top 5 maiores riscos)
        """
        result = {
            'cost_center_id': str(cost_center.id),
            'cost_center_name': cost_center.name,
            'snapshot_date': None,
            'bar_total': Decimal('0.00'),
            'assets_count': 0,
            'avg_risk_score': Decimal('0.00'),
            'max_risk_score': Decimal('0.00'),
            'breakdown_by_level': {},
            'top_risks': [],
        }
        
        # Determinar centros a considerar
        if include_children:
            cc_ids = cls._get_cost_center_tree_ids(cost_center)
        else:
            cc_ids = [cost_center.id]
        
        # Buscar snapshots mais recentes
        if snapshot_date:
            snapshots = RiskSnapshot.objects.filter(
                cost_center_id__in=cc_ids,
                snapshot_date=snapshot_date,
            )
            result['snapshot_date'] = snapshot_date.isoformat()
        else:
            # Pegar a data mais recente disponível
            latest_date = RiskSnapshot.objects.filter(
                cost_center_id__in=cc_ids
            ).aggregate(max_date=Max('snapshot_date'))['max_date']
            
            if not latest_date:
                return result
            
            snapshots = RiskSnapshot.objects.filter(
                cost_center_id__in=cc_ids,
                snapshot_date=latest_date,
            )
            result['snapshot_date'] = latest_date.isoformat()
        
        # Agregar métricas
        aggregation = snapshots.aggregate(
            total_bar=Sum('risk_score'),
            avg_score=Avg('risk_score'),
            max_score=Max('risk_score'),
            asset_count=Count('asset', distinct=True),
        )
        
        result['bar_total'] = aggregation['total_bar'] or Decimal('0.00')
        result['avg_risk_score'] = Decimal(str(aggregation['avg_score'] or 0)).quantize(Decimal('0.01'))
        result['max_risk_score'] = aggregation['max_score'] or Decimal('0.00')
        result['assets_count'] = aggregation['asset_count'] or 0
        
        # Breakdown por nível de risco
        level_breakdown = snapshots.values('risk_level').annotate(
            count=Count('id'),
            total_bar=Sum('risk_score'),
        ).order_by('-total_bar')
        
        result['breakdown_by_level'] = {
            item['risk_level']: {
                'count': item['count'],
                'bar': float(item['total_bar']),
            }
            for item in level_breakdown
        }
        
        # Top 5 maiores riscos
        top_risks = snapshots.select_related('asset').order_by('-risk_score')[:5]
        result['top_risks'] = [
            {
                'asset_id': str(snap.asset_id),
                'asset_name': str(snap.asset) if snap.asset else 'N/A',
                'risk_score': float(snap.risk_score),
                'risk_level': snap.risk_level,
                'failure_probability': float(snap.failure_probability),
                'total_impact': float(snap.total_impact_cost),
            }
            for snap in top_risks
        ]
        
        return result
    
    @classmethod
    def _get_cost_center_tree_ids(cls, cost_center: CostCenter) -> List[UUID]:
        """Retorna IDs do centro e todos seus descendentes."""
        ids = [cost_center.id]
        
        # Buscar filhos recursivamente
        children = CostCenter.objects.filter(parent=cost_center, is_active=True)
        for child in children:
            ids.extend(cls._get_cost_center_tree_ids(child))
        
        return ids
    
    @classmethod
    def calculate_bar_summary(
        cls,
        snapshot_date: Optional[date] = None,
        top_n: int = 10,
    ) -> Dict[str, Any]:
        """
        Calcula BAR consolidado para toda a organização.
        
        Args:
            snapshot_date: Data do snapshot (default: mais recente)
            top_n: Quantidade de top riscos a retornar
            
        Returns:
            Dict com resultado consolidado:
            - total_bar: Decimal
            - assets_at_risk: int
            - critical_assets: int
            - high_risk_assets: int
            - by_cost_center: list
            - top_risks: list
            - trend: dict (se houver histórico)
        """
        result = {
            'snapshot_date': None,
            'total_bar': Decimal('0.00'),
            'assets_at_risk': 0,
            'critical_assets': 0,
            'high_risk_assets': 0,
            'by_cost_center': [],
            'top_risks': [],
            'trend': None,
        }
        
        # Determinar data do snapshot
        if snapshot_date:
            target_date = snapshot_date
        else:
            target_date = RiskSnapshot.objects.aggregate(
                max_date=Max('snapshot_date')
            )['max_date']
            
            if not target_date:
                return result
        
        result['snapshot_date'] = target_date.isoformat()
        
        # Agregação geral
        snapshots = RiskSnapshot.objects.filter(snapshot_date=target_date)
        
        aggregation = snapshots.aggregate(
            total_bar=Sum('risk_score'),
            total_assets=Count('asset', distinct=True),
        )
        
        result['total_bar'] = aggregation['total_bar'] or Decimal('0.00')
        result['assets_at_risk'] = aggregation['total_assets'] or 0
        
        # Contar por nível
        result['critical_assets'] = snapshots.filter(
            risk_level=RiskSnapshot.RiskLevel.CRITICAL
        ).count()
        result['high_risk_assets'] = snapshots.filter(
            risk_level=RiskSnapshot.RiskLevel.HIGH
        ).count()
        
        # BAR por centro de custo
        by_cc = snapshots.values(
            'cost_center__id',
            'cost_center__name',
            'cost_center__code',
        ).annotate(
            bar=Sum('risk_score'),
            assets=Count('asset', distinct=True),
        ).order_by('-bar')[:10]
        
        result['by_cost_center'] = [
            {
                'cost_center_id': str(item['cost_center__id']),
                'cost_center_name': item['cost_center__name'],
                'cost_center_code': item['cost_center__code'],
                'bar': float(item['bar']),
                'assets': item['assets'],
            }
            for item in by_cc
        ]
        
        # Top N riscos
        top_risks = snapshots.select_related('asset', 'cost_center').order_by('-risk_score')[:top_n]
        result['top_risks'] = [
            {
                'asset_id': str(snap.asset_id),
                'asset_name': str(snap.asset) if snap.asset else 'N/A',
                'cost_center_name': snap.cost_center.name if snap.cost_center else 'N/A',
                'risk_score': float(snap.risk_score),
                'risk_level': snap.risk_level,
                'failure_probability': float(snap.failure_probability),
                'repair_cost': float(snap.estimated_repair_cost),
                'downtime_cost': float(snap.downtime_cost),
            }
            for snap in top_risks
        ]
        
        # Calcular tendência (últimos 3 snapshots)
        result['trend'] = cls._calculate_trend(target_date)
        
        return result
    
    @classmethod
    def _calculate_trend(cls, current_date: date) -> Optional[Dict[str, Any]]:
        """Calcula tendência do BAR baseado em snapshots anteriores."""
        # Buscar datas únicas de snapshot ordenadas
        dates = RiskSnapshot.objects.filter(
            snapshot_date__lte=current_date
        ).values_list('snapshot_date', flat=True).distinct().order_by('-snapshot_date')[:3]
        
        if len(dates) < 2:
            return None
        
        # BAR para cada data
        bar_by_date = []
        for d in dates:
            total = RiskSnapshot.objects.filter(
                snapshot_date=d
            ).aggregate(total=Sum('risk_score'))['total'] or Decimal('0')
            bar_by_date.append({
                'date': d.isoformat(),
                'bar': float(total),
            })
        
        # Calcular variação
        current_bar = bar_by_date[0]['bar']
        previous_bar = bar_by_date[1]['bar']
        
        if previous_bar > 0:
            change_percent = ((current_bar - previous_bar) / previous_bar) * 100
        else:
            change_percent = 0 if current_bar == 0 else 100
        
        return {
            'direction': 'up' if change_percent > 0 else 'down' if change_percent < 0 else 'stable',
            'change_percent': round(change_percent, 2),
            'history': bar_by_date,
        }
    
    @classmethod
    def get_assets_by_risk_level(
        cls,
        risk_level: str,
        cost_center: Optional[CostCenter] = None,
        snapshot_date: Optional[date] = None,
    ) -> List[Dict[str, Any]]:
        """
        Lista ativos por nível de risco.
        
        Args:
            risk_level: Nível de risco ('low', 'medium', 'high', 'critical')
            cost_center: Filtrar por centro de custo
            snapshot_date: Data do snapshot
            
        Returns:
            Lista de ativos com detalhes de risco
        """
        # Determinar data
        if snapshot_date:
            target_date = snapshot_date
        else:
            target_date = RiskSnapshot.objects.aggregate(
                max_date=Max('snapshot_date')
            )['max_date']
            
            if not target_date:
                return []
        
        # Query base
        snapshots = RiskSnapshot.objects.filter(
            snapshot_date=target_date,
            risk_level=risk_level,
        ).select_related('asset', 'cost_center')
        
        if cost_center:
            cc_ids = cls._get_cost_center_tree_ids(cost_center)
            snapshots = snapshots.filter(cost_center_id__in=cc_ids)
        
        return [
            {
                'asset_id': str(snap.asset_id),
                'asset_name': str(snap.asset) if snap.asset else 'N/A',
                'cost_center_id': str(snap.cost_center_id),
                'cost_center_name': snap.cost_center.name if snap.cost_center else 'N/A',
                'risk_score': float(snap.risk_score),
                'failure_probability': float(snap.failure_probability),
                'mtbf_days': snap.mtbf_days,
                'repair_cost': float(snap.estimated_repair_cost),
                'downtime_hours': float(snap.estimated_downtime_hours),
                'downtime_cost': float(snap.downtime_cost),
                'total_impact': float(snap.total_impact_cost),
            }
            for snap in snapshots.order_by('-risk_score')
        ]
    
    @classmethod
    def forecast_bar(
        cls,
        cost_center: Optional[CostCenter] = None,
        months_ahead: int = 3,
    ) -> Dict[str, Any]:
        """
        Projeta BAR para os próximos meses com base em tendência.
        
        Args:
            cost_center: Centro de custo (None = toda organização)
            months_ahead: Meses para projetar
            
        Returns:
            Dict com projeção:
            - current_bar: Decimal
            - forecast: list de {month, projected_bar}
            - assumptions: str
        """
        result = {
            'current_bar': Decimal('0.00'),
            'forecast': [],
            'assumptions': 'Projeção linear baseada na tendência dos últimos 3 meses',
        }
        
        # BAR atual
        if cost_center:
            current = cls.calculate_bar_for_cost_center(cost_center)
            result['current_bar'] = current['bar_total']
            trend_data = None  # TODO: calcular tendência por CC
        else:
            summary = cls.calculate_bar_summary()
            result['current_bar'] = summary['total_bar']
            trend_data = summary.get('trend')
        
        # Projetar baseado na tendência
        if trend_data and trend_data['direction'] != 'stable':
            monthly_change = (trend_data['change_percent'] / 100) / 30  # Taxa diária
            
            current_bar = float(result['current_bar'])
            for i in range(1, months_ahead + 1):
                days = i * 30
                projected = current_bar * (1 + monthly_change * days)
                result['forecast'].append({
                    'month': i,
                    'projected_bar': round(max(0, projected), 2),
                })
        else:
            # Sem tendência = manter estável
            for i in range(1, months_ahead + 1):
                result['forecast'].append({
                    'month': i,
                    'projected_bar': float(result['current_bar']),
                })
        
        return result
