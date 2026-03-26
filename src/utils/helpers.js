export const formatDate = (val) => {
    if (!val) return '-';
    // Handle Firestore Timestamps (which have seconds) or standard Dates
    const d = new Date(val.seconds ? val.seconds * 1000 : val);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).replace(/ /g, '-');
};

export const formatMoney = (amount, currency = 'INR', showDecimals = true) => {
    const num = amount || 0;
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: showDecimals ? 2 : 0,
        minimumFractionDigits: 0
    }).format(num);
};