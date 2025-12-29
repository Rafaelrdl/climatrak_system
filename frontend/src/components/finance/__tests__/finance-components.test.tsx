/**
 * Testes para componentes Finance
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MoneyCell } from '@/components/finance/MoneyCell';
import { DeltaBadge } from '@/components/finance/DeltaBadge';

describe('MoneyCell', () => {
  it('formata valor em BRL corretamente', () => {
    render(<MoneyCell value={1234.56} />);
    expect(screen.getByText(/R\$\s*1\.234,56/)).toBeInTheDocument();
  });

  it('formata valor em USD corretamente', () => {
    render(<MoneyCell value={1234.56} currency="USD" />);
    expect(screen.getByText(/\$1,234\.56/)).toBeInTheDocument();
  });

  it('exibe sinal quando showSign=true', () => {
    render(<MoneyCell value={100} showSign />);
    expect(screen.getByText(/\+/)).toBeInTheDocument();
  });

  it('aplica cor verde para valor positivo quando colorize=true', () => {
    const { container } = render(<MoneyCell value={100} colorize />);
    expect(container.firstChild).toHaveClass('text-emerald-600');
  });

  it('aplica cor vermelha para valor negativo quando colorize=true', () => {
    const { container } = render(<MoneyCell value={-100} colorize />);
    expect(container.firstChild).toHaveClass('text-red-600');
  });
});

describe('DeltaBadge', () => {
  it('exibe variação positiva com ícone de alta', () => {
    render(<DeltaBadge value={10} type="percent" />);
    expect(screen.getByText('+10.0%')).toBeInTheDocument();
  });

  it('exibe variação negativa com ícone de queda', () => {
    render(<DeltaBadge value={-5} type="percent" />);
    expect(screen.getByText('-5.0%')).toBeInTheDocument();
  });

  it('inverte cores quando inverted=true', () => {
    const { container } = render(<DeltaBadge value={-10} inverted />);
    // Valor negativo com inverted = verde (positivo)
    expect(container.querySelector('.bg-emerald-100')).toBeInTheDocument();
  });
});
