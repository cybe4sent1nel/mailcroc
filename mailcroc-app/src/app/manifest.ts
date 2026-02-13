import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'MailCroc | Temp Mail',
        short_name: 'MailCroc',
        description: 'Secure, fast, and professional temporary email service.',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#84cc16',
        icons: [
            {
                src: '/logo.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: '/logo.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/logo.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: '/logo.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
        ],
        shortcuts: [
            {
                name: 'Compose New Email',
                short_name: 'Compose',
                description: 'Open the compose window immediately',
                url: '/?compose=true',
                icons: [{ src: '/logo.png', sizes: '192x192' }]
            }
        ]
    }
}
