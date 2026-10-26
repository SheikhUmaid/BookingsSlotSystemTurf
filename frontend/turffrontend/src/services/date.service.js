export function dateFormatter(isodate) {
    const date = new Date(isodate);

    const formattedDate = new Intl.DateTimeFormat('en-GB', {
        weekday: 'short', // "Fri"
        day: '2-digit',   // "06"
        month: 'short'    // "Oct"
    }).format(date);

    return formattedDate
}
