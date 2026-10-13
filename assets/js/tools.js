/* Mortgage calculator for the existing mortgage page. Leads use direct office contact. */
(() => {
  'use strict';
  const money = value => new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 0}).format(value);
  const rub = value => `${money(value)} ₽`;
  const parse = input => input.value.trim() === '' ? null : Number(input.value.replace(/[\s\u00a0]/g, '').replace(',', '.'));

  function initMortgage(root) {
    const field = name => root.querySelector(`[name="${name}"]`);
    const output = name => root.querySelector(`[data-out="${name}"]`);
    const names = ['price', 'down', 'years', 'rate'];
    const ranges = [...root.querySelectorAll('input[type=range][data-for]')];
    const error = document.createElement('p');
    error.className = 'budget-error';
    error.setAttribute('role', 'alert');
    error.hidden = true;
    root.querySelector('.mcalc__inputs').appendChild(error);

    const syncRanges = () => ranges.forEach(range => {
      const value = parse(field(range.dataset.for));
      if (value !== null && Number.isFinite(value)) range.value = String(value);
      const percent = (Number(range.value) - Number(range.min)) / (Number(range.max) - Number(range.min)) * 100;
      range.style.setProperty('--fill', `${Math.max(0, Math.min(100, percent))}%`);
    });

    const calculate = () => {
      const values = Object.fromEntries(names.map(name => [name, parse(field(name))]));
      let message = '';
      for (const name of names) {
        const value = values[name];
        const optional = name === 'rate';
        const invalid = value === null ? !optional : !Number.isFinite(value) || value < 0 || value > (name === 'rate' ? 100 : name === 'years' ? 40 : 1e9);
        field(name).setAttribute('aria-invalid', String(invalid));
        if (invalid) message = 'Проверьте значения: стоимость и взнос должны быть неотрицательными числами, ставка — от 0 до 100%.';
      }
      const {price, down, years, rate} = values;
      if (years === null || years < 1 || !Number.isInteger(years) || years > 40) {
        message = 'Укажите срок кредита от 1 до 40 полных лет.';
        field('years').setAttribute('aria-invalid', 'true');
      }
      if (price !== null && down !== null && down > price) {
        message = 'Первоначальный взнос не может быть больше стоимости объекта.';
        field('down').setAttribute('aria-invalid', 'true');
      }
      error.textContent = message;
      error.hidden = !message;
      if (message) {
        ['pay', 'loan', 'over', 'total', 'income', 'downpct'].forEach(name => { output(name).textContent = '—'; });
        root.querySelector('[data-bar-loan]').style.width = '0%';
        syncRanges();
        return;
      }
      const loan = price - down;
      const hasRate = rate !== null || loan === 0;
      const months = years * 12;
      const monthlyRate = (rate || 0) / 1200;
      const payment = loan === 0 ? 0 : monthlyRate === 0 ? loan / months : loan * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
      const total = payment * months;
      output('pay').textContent = hasRate ? rub(payment) : 'Введите ставку';
      output('loan').textContent = rub(loan);
      output('over').textContent = hasRate ? rub(Math.max(0, total - loan)) : '—';
      output('total').textContent = hasRate ? rub(total + down) : '—';
      output('income').textContent = hasRate ? rub(payment * 2) : '—';
      output('downpct').textContent = price > 0 ? `${Math.round(down / price * 100)}% от стоимости` : '';
      output('pay').classList.toggle('mcalc__pay--prompt', !hasRate);
      root.querySelector('[data-bar-loan]').style.width = hasRate && total > 0 ? `${loan / total * 100}%` : '0%';
      syncRanges();
    };

    ranges.forEach(range => range.addEventListener('input', () => {
      field(range.dataset.for).value = ['price', 'down'].includes(range.dataset.for) ? money(Number(range.value)) : range.value;
      calculate();
    }));
    names.forEach(name => field(name).addEventListener('input', calculate));
    ['price', 'down'].forEach(name => {
      const input = field(name);
      const format = () => { const value = parse(input); if (value !== null && Number.isFinite(value)) input.value = money(value); };
      format();
      input.addEventListener('blur', format);
    });
    root.querySelectorAll('[data-down-pct]').forEach(button => button.addEventListener('click', () => {
      const price = parse(field('price'));
      if (price === null || !Number.isFinite(price) || price < 0) return;
      field('down').value = money(price * Number(button.dataset.downPct) / 100);
      calculate();
    }));
    calculate();
  }
  document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('[data-mortgage]').forEach(initMortgage));
})();
