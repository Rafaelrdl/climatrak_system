"""
Cost Engine - Processamento de Custos de OS

Serviço responsável por:
1. Consumir eventos work_order.closed
2. Calcular custos de labor, parts e third_party
3. Criar CostTransactions no ledger (idempotente)
4. Emitir eventos cost.entry_posted

Regras de negócio:
- docs/finance/02-regras-negocio.md
- docs/events/02-eventos-mvp.md
"""

import logging
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple, Union
from uuid import UUID

from django.db import transaction
from django.utils import timezone

from .models import CostCenter, CostTransaction, RateCard
from apps.core_events.services import EventPublisher

logger = logging.getLogger(__name__)


def _resolve_work_order(work_order_id: Union[str, int, None]) -> Optional[int]:
    """
    Resolve work_order_id para um ID numérico válido se o objeto existir.
    
    Retorna None se:
    - work_order_id é None
    - work_order_id é um UUID (string não numérica)
    - WorkOrder não existe no banco
    """
    if work_order_id is None:
        return None
    
    # Se for string, tentar converter para int
    if isinstance(work_order_id, str):
        try:
            work_order_id = int(work_order_id)
        except ValueError:
            # UUID ou outro formato não numérico - não pode ser FK
            logger.debug(f"work_order_id '{work_order_id}' is not numeric, storing in meta only")
            return None
    
    # Verificar se existe
    try:
        from apps.cmms.models import WorkOrder
        if WorkOrder.objects.filter(pk=work_order_id).exists():
            return work_order_id
    except Exception as e:
        logger.warning(f"Could not verify WorkOrder {work_order_id}: {e}")
    
    return None


def _resolve_asset(asset_id: Union[str, int, None]) -> Optional[int]:
    """
    Resolve asset_id para um ID numérico válido se o objeto existir.
    
    Retorna None se:
    - asset_id é None
    - asset_id é um UUID (string não numérica)
    - Asset não existe no banco
    """
    if asset_id is None:
        return None
    
    # Se for string, tentar converter para int
    if isinstance(asset_id, str):
        try:
            asset_id = int(asset_id)
        except ValueError:
            # UUID ou outro formato não numérico - não pode ser FK
            logger.debug(f"asset_id '{asset_id}' is not numeric, storing in meta only")
            return None
    
    # Verificar se existe
    try:
        from apps.assets.models import Asset
        if Asset.objects.filter(pk=asset_id).exists():
            return asset_id
    except Exception as e:
        logger.warning(f"Could not verify Asset {asset_id}: {e}")
    
    return None


class CostEngineError(Exception):
    """Erro base do Cost Engine."""
    pass


class CostEngineService:
    """
    Serviço principal do Cost Engine.
    
    Processa eventos work_order.closed e cria lançamentos no ledger.
    Garante idempotência via idempotency_key.
    """
    
    # Mapeamento de categoria da OS para categoria Finance
    CATEGORY_MAP = {
        'preventive': CostTransaction.Category.PREVENTIVE,
        'corrective': CostTransaction.Category.CORRECTIVE,
        'predictive': CostTransaction.Category.PREDICTIVE,
        'emergency': CostTransaction.Category.CORRECTIVE,  # emergency -> corrective
        'request': CostTransaction.Category.OTHER,
        'improvement': CostTransaction.Category.IMPROVEMENT,
        'other': CostTransaction.Category.OTHER,
    }
    
    @classmethod
    def process_work_order_closed(
        cls,
        event_data: Dict[str, Any],
        tenant_id: str,
    ) -> Dict[str, Any]:
        """
        Processa evento work_order.closed e cria lançamentos no ledger.
        
        Args:
            event_data: Dados do evento (payload)
            tenant_id: ID do tenant
            
        Returns:
            Dict com resultado:
            - success: bool
            - transactions_created: int
            - transactions: list de IDs das transações criadas
            - events_published: int
            - skipped: int (duplicatas ignoradas)
            
        Raises:
            CostEngineError: Se dados obrigatórios estiverem faltando
        """
        work_order_id = event_data.get('work_order_id')
        asset_id = event_data.get('asset_id')
        cost_center_id = event_data.get('cost_center_id')
        category = event_data.get('category', 'other')
        completed_at = event_data.get('completed_at')
        
        labor_entries = event_data.get('labor', [])
        parts_entries = event_data.get('parts', [])
        third_party_entries = event_data.get('third_party', [])
        
        # Validação básica
        if not work_order_id:
            raise CostEngineError("work_order_id é obrigatório")
        if not asset_id:
            raise CostEngineError("asset_id é obrigatório")
        
        # Validar cost_center se fornecido
        cost_center = None
        if cost_center_id:
            try:
                cost_center = CostCenter.objects.get(id=cost_center_id)
            except CostCenter.DoesNotExist:
                logger.warning(f"CostCenter {cost_center_id} não encontrado, usando default")
                cost_center = cls._get_default_cost_center()
        else:
            cost_center = cls._get_default_cost_center()
        
        if not cost_center:
            raise CostEngineError("Nenhum CostCenter disponível para lançamento")
        
        # Mapear categoria
        finance_category = cls.CATEGORY_MAP.get(category, CostTransaction.Category.OTHER)
        
        # Determinar data de ocorrência
        if completed_at:
            from django.utils.dateparse import parse_datetime
            occurred_at = parse_datetime(completed_at) or timezone.now()
        else:
            occurred_at = timezone.now()
        
        result = {
            'success': False,
            'transactions_created': 0,
            'transactions': [],
            'events_published': 0,
            'skipped': 0,
            'errors': [],
        }
        
        with transaction.atomic():
            # Processar labor
            labor_result = cls._process_labor(
                work_order_id=work_order_id,
                asset_id=asset_id,
                cost_center=cost_center,
                category=finance_category,
                occurred_at=occurred_at,
                labor_entries=labor_entries,
                tenant_id=tenant_id,
            )
            result['transactions'].extend(labor_result['transactions'])
            result['transactions_created'] += labor_result['created']
            result['skipped'] += labor_result['skipped']
            result['events_published'] += labor_result['events']
            
            # Processar parts
            parts_result = cls._process_parts(
                work_order_id=work_order_id,
                asset_id=asset_id,
                cost_center=cost_center,
                category=finance_category,
                occurred_at=occurred_at,
                parts_entries=parts_entries,
                tenant_id=tenant_id,
            )
            result['transactions'].extend(parts_result['transactions'])
            result['transactions_created'] += parts_result['created']
            result['skipped'] += parts_result['skipped']
            result['events_published'] += parts_result['events']
            
            # Processar third_party
            third_party_result = cls._process_third_party(
                work_order_id=work_order_id,
                asset_id=asset_id,
                cost_center=cost_center,
                category=finance_category,
                occurred_at=occurred_at,
                third_party_entries=third_party_entries,
                tenant_id=tenant_id,
            )
            result['transactions'].extend(third_party_result['transactions'])
            result['transactions_created'] += third_party_result['created']
            result['skipped'] += third_party_result['skipped']
            result['events_published'] += third_party_result['events']
        
        result['success'] = True
        logger.info(
            f"CostEngine processed wo:{work_order_id} - "
            f"created:{result['transactions_created']} skipped:{result['skipped']} "
            f"events:{result['events_published']}"
        )
        
        return result
    
    @classmethod
    def _get_default_cost_center(cls) -> Optional[CostCenter]:
        """Retorna o primeiro CostCenter ativo como fallback."""
        return CostCenter.objects.filter(is_active=True).first()
    
    @classmethod
    def _process_labor(
        cls,
        work_order_id: str,
        asset_id: str,
        cost_center: CostCenter,
        category: str,
        occurred_at,
        labor_entries: List[Dict],
        tenant_id: str,
    ) -> Dict[str, Any]:
        """
        Processa apontamentos de mão de obra.
        
        Para cada entry, calcula custo usando:
        1. hourly_rate do próprio entry (se disponível)
        2. RateCard vigente para o role
        
        Cria uma CostTransaction consolidada para todo labor da OS.
        """
        result = {'transactions': [], 'created': 0, 'skipped': 0, 'events': 0}
        
        if not labor_entries:
            return result
        
        # Precisão para valores monetários
        TWO_PLACES = Decimal('0.01')
        
        # Calcular custo total de labor
        total_labor_cost = Decimal('0')
        labor_breakdown = []
        
        for entry in labor_entries:
            role = entry.get('role', 'Unknown')
            hours = Decimal(str(entry.get('hours', 0)))
            hourly_rate = entry.get('hourly_rate')
            
            # Determinar rate
            if hourly_rate is not None:
                rate = Decimal(str(hourly_rate))
            else:
                # Buscar no RateCard
                rate_card = RateCard.get_rate_for_role(
                    role=entry.get('role_code') or role,
                    date=occurred_at.date() if hasattr(occurred_at, 'date') else occurred_at
                )
                rate = rate_card.cost_per_hour if rate_card else Decimal('0')
            
            entry_cost = (hours * rate).quantize(TWO_PLACES)
            total_labor_cost += entry_cost
            
            labor_breakdown.append({
                'time_entry_id': entry.get('time_entry_id'),
                'role': role,
                'hours': float(hours),
                'rate': float(rate),
                'cost': float(entry_cost),
            })
        
        if total_labor_cost > 0:
            # Idempotency key para labor da OS
            idempotency_key = f"wo:{work_order_id}:labor"
            
            # Verificar se já existe
            existing = CostTransaction.objects.filter(
                idempotency_key=idempotency_key
            ).first()
            
            if existing:
                logger.info(f"Labor transaction already exists: {idempotency_key}")
                result['skipped'] = 1
                result['transactions'].append(str(existing.id))
            else:
                # Criar transação
                tx = CostTransaction.objects.create(
                    idempotency_key=idempotency_key,
                    transaction_type=CostTransaction.TransactionType.LABOR,
                    category=category,
                    amount=total_labor_cost,
                    occurred_at=occurred_at,
                    description=f"Mão de obra OS - {len(labor_entries)} apontamentos",
                    meta={
                        'work_order_id': work_order_id,
                        'asset_id': asset_id,
                        'breakdown': labor_breakdown,
                        'total_hours': sum(e['hours'] for e in labor_breakdown),
                    },
                    cost_center=cost_center,
                    asset_id=_resolve_asset(asset_id),
                    work_order_id=_resolve_work_order(work_order_id),
                )
                
                result['created'] = 1
                result['transactions'].append(str(tx.id))
                
                # Emitir evento cost.entry_posted
                cls._publish_cost_entry_posted(
                    transaction=tx,
                    tenant_id=tenant_id,
                    work_order_id=work_order_id,
                    asset_id=asset_id,
                    category=category,
                )
                result['events'] = 1
        
        return result
    
    @classmethod
    def _process_parts(
        cls,
        work_order_id: str,
        asset_id: str,
        cost_center: CostCenter,
        category: str,
        occurred_at,
        parts_entries: List[Dict],
        tenant_id: str,
    ) -> Dict[str, Any]:
        """
        Processa uso de peças/materiais.
        
        Custo = qty * unit_cost para cada item.
        Cria uma CostTransaction consolidada para todas as peças da OS.
        """
        result = {'transactions': [], 'created': 0, 'skipped': 0, 'events': 0}
        
        if not parts_entries:
            return result
        
        # Calcular custo total de parts
        # Precisão para valores monetários
        TWO_PLACES = Decimal('0.01')
        
        total_parts_cost = Decimal('0')
        parts_breakdown = []
        
        for entry in parts_entries:
            qty = Decimal(str(entry.get('qty', 0)))
            unit_cost = Decimal(str(entry.get('unit_cost', 0) or 0))
            entry_cost = (qty * unit_cost).quantize(TWO_PLACES)
            total_parts_cost += entry_cost
            
            parts_breakdown.append({
                'part_usage_id': entry.get('part_usage_id'),
                'part_id': entry.get('part_id'),
                'part_name': entry.get('part_name'),
                'part_number': entry.get('part_number'),
                'qty': float(qty),
                'unit_cost': float(unit_cost),
                'total_cost': float(entry_cost),
            })
        
        if total_parts_cost > 0:
            # Idempotency key para parts da OS
            idempotency_key = f"wo:{work_order_id}:parts"
            
            # Verificar se já existe
            existing = CostTransaction.objects.filter(
                idempotency_key=idempotency_key
            ).first()
            
            if existing:
                logger.info(f"Parts transaction already exists: {idempotency_key}")
                result['skipped'] = 1
                result['transactions'].append(str(existing.id))
            else:
                # Criar transação
                tx = CostTransaction.objects.create(
                    idempotency_key=idempotency_key,
                    transaction_type=CostTransaction.TransactionType.PARTS,
                    category=category,
                    amount=total_parts_cost,
                    occurred_at=occurred_at,
                    description=f"Peças/Materiais OS - {len(parts_entries)} itens",
                    meta={
                        'work_order_id': work_order_id,
                        'asset_id': asset_id,
                        'breakdown': parts_breakdown,
                        'total_items': len(parts_breakdown),
                    },
                    cost_center=cost_center,
                    asset_id=_resolve_asset(asset_id),
                    work_order_id=_resolve_work_order(work_order_id),
                )
                
                result['created'] = 1
                result['transactions'].append(str(tx.id))
                
                # Emitir evento cost.entry_posted
                cls._publish_cost_entry_posted(
                    transaction=tx,
                    tenant_id=tenant_id,
                    work_order_id=work_order_id,
                    asset_id=asset_id,
                    category=category,
                )
                result['events'] = 1
        
        return result
    
    @classmethod
    def _process_third_party(
        cls,
        work_order_id: str,
        asset_id: str,
        cost_center: CostCenter,
        category: str,
        occurred_at,
        third_party_entries: List[Dict],
        tenant_id: str,
    ) -> Dict[str, Any]:
        """
        Processa custos de terceiros.
        
        Cada entry tem um amount direto.
        Cria uma CostTransaction consolidada para todos os custos externos da OS.
        """
        result = {'transactions': [], 'created': 0, 'skipped': 0, 'events': 0}
        
        if not third_party_entries:
            return result
        
        # Calcular custo total de third_party
        total_third_party_cost = Decimal('0')
        third_party_breakdown = []
        
        # Precisão para valores monetários
        TWO_PLACES = Decimal('0.01')
        
        for entry in third_party_entries:
            amount = Decimal(str(entry.get('amount', 0))).quantize(TWO_PLACES)
            total_third_party_cost += amount
            
            third_party_breakdown.append({
                'external_cost_id': entry.get('external_cost_id'),
                'cost_type': entry.get('cost_type'),
                'supplier_name': entry.get('supplier_name'),
                'description': entry.get('description'),
                'amount': float(amount),
                'invoice_number': entry.get('invoice_number'),
            })
        
        if total_third_party_cost > 0:
            # Idempotency key para third_party da OS
            idempotency_key = f"wo:{work_order_id}:third_party"
            
            # Verificar se já existe
            existing = CostTransaction.objects.filter(
                idempotency_key=idempotency_key
            ).first()
            
            if existing:
                logger.info(f"Third party transaction already exists: {idempotency_key}")
                result['skipped'] = 1
                result['transactions'].append(str(existing.id))
            else:
                # Criar transação
                tx = CostTransaction.objects.create(
                    idempotency_key=idempotency_key,
                    transaction_type=CostTransaction.TransactionType.THIRD_PARTY,
                    category=category,
                    amount=total_third_party_cost,
                    occurred_at=occurred_at,
                    description=f"Serviços terceiros OS - {len(third_party_entries)} fornecedores",
                    meta={
                        'work_order_id': work_order_id,
                        'asset_id': asset_id,
                        'breakdown': third_party_breakdown,
                        'suppliers': list(set(
                            e.get('supplier_name', 'Unknown') 
                            for e in third_party_breakdown
                        )),
                    },
                    cost_center=cost_center,
                    asset_id=_resolve_asset(asset_id),
                    work_order_id=_resolve_work_order(work_order_id),
                )
                
                result['created'] = 1
                result['transactions'].append(str(tx.id))
                
                # Emitir evento cost.entry_posted
                cls._publish_cost_entry_posted(
                    transaction=tx,
                    tenant_id=tenant_id,
                    work_order_id=work_order_id,
                    asset_id=asset_id,
                    category=category,
                )
                result['events'] = 1
        
        return result
    
    @classmethod
    def _publish_cost_entry_posted(
        cls,
        transaction: CostTransaction,
        tenant_id: str,
        work_order_id: str,
        asset_id: str,
        category: str,
    ) -> None:
        """
        Publica evento cost.entry_posted após criar transação.
        
        Payload conforme docs/events/02-eventos-mvp.md
        """
        event_data = {
            'cost_transaction_id': str(transaction.id),
            'transaction_type': transaction.transaction_type,
            'amount': float(transaction.amount),
            'work_order_id': work_order_id,
            'asset_id': asset_id,
            'category': category,
            'cost_center_id': str(transaction.cost_center_id),
            'occurred_at': transaction.occurred_at.isoformat(),
        }
        
        # Idempotency key para o evento
        idempotency_key = f"cost_posted:{transaction.id}"
        
        EventPublisher.publish(
            tenant_id=tenant_id,
            event_name='cost.entry_posted',
            aggregate_type='cost_transaction',
            aggregate_id=transaction.id,
            data=event_data,
            idempotency_key=idempotency_key,
            occurred_at=transaction.occurred_at,
        )
        
        logger.info(f"Published cost.entry_posted for transaction {transaction.id}")
