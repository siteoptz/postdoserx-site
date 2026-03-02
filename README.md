# PostDoseRx Website

Landing page and website for PostDoseRx - the first meal planning platform designed specifically for GLP-1 medication users.

## 🏗️ Repository Structure

```
postdoserx-site/
├── index.html                              # Main landing page
├── privacy.html                            # Privacy policy (SEO optimized)
├── terms.html                              # Terms of service (SEO optimized)
├── README.md                               # This file
├── PostDoseRX_7Day_GLP1_Meal_Plan_Content.md  # PDF lead magnet content outline
└── assets/
    ├── styles.css                          # Shared CSS styles
    ├── scripts.js                          # Shared JavaScript
    └── PostDoseRX_7Day_GLP1_Meal_Plan.pdf  # Lead magnet (to be created)
```

## 🎯 Features

### Landing Page (index.html)
- **Modern, responsive design** with mobile-first approach
- **Conversion-focused layout** with clear CTAs
- **GLP-1-specific messaging** for Ozempic, Wegovy, Mounjaro users
- **Email capture form** for lead magnet download
- **Social proof** with relevant statistics
- **Feature showcase** highlighting unique value propositions

### Legal Pages
- **Privacy Policy** (privacy.html) - GDPR compliant, health-focused
- **Terms of Service** (terms.html) - Medical disclaimers, subscription terms

### Lead Magnet
- **7-Day GLP-1 Meal Plan** - Detailed content outline ready for PDF creation
- **18 pages** of comprehensive meal planning guidance
- **GLP-1-specific** tips and strategies
- **Professional design ready** for tools like Canva or Adobe

## 🛠️ Technical Stack

- **HTML5** - Semantic, accessible markup
- **CSS3** - Modern styling with CSS Grid and Flexbox
- **Vanilla JavaScript** - No framework dependencies
- **Inter Font** - Clean, professional typography
- **Responsive Design** - Mobile-first approach

## 🎨 Design System

### Colors
- **Primary**: #4F46E5 (Indigo)
- **Secondary**: #10B981 (Emerald)
- **Background**: #F8FAFC (Light gray)
- **Text**: #1F2937 (Dark gray)

### Typography
- **Font Family**: Inter (Google Fonts)
- **Weights**: 300, 400, 500, 600, 700

### Components
- **Cards** with hover effects
- **Buttons** with multiple variants
- **Forms** with validation
- **Grid layouts** for responsive design

## 📧 Email Integration Setup

The email signup forms are ready for integration with:

### Recommended Email Providers
1. **ConvertKit** - Best for creators and courses
2. **Mailchimp** - Popular with good automation
3. **SendGrid** - Developer-friendly API

### Integration Steps
1. Choose your email service provider
2. Get API credentials
3. Update the form submission handler in `assets/scripts.js`
4. Test the integration
5. Set up email automation sequences

### Current Implementation
- Form validation included
- Success/error messaging
- Analytics tracking ready (Google Analytics + Facebook Pixel)

## 🚀 Deployment Options

### Quick Deploy (Free)
- **Netlify**: Drag and drop the folder
- **Vercel**: Connect GitHub repository
- **GitHub Pages**: Enable in repository settings

### Custom Domain Setup
1. Purchase domain (suggest: postdoserx.com)
2. Point DNS to hosting provider
3. Enable HTTPS
4. Test all forms and links

## 📊 Analytics Setup

### Google Analytics 4
```javascript
// Add to <head> of all pages
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_TRACKING_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_TRACKING_ID');
</script>
```

### Facebook Pixel
```javascript
// Add to <head> of all pages
<!-- Facebook Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'PIXEL_ID');
fbq('track', 'PageView');
</script>
```

## 🔧 Development

### Local Development
```bash
# Clone the repository
git clone https://github.com/yourusername/postdoserx-site.git

# Navigate to project
cd postdoserx-site

# Open in browser
open index.html

# Or use a local server
python -m http.server 8000
# Visit http://localhost:8000
```

### File Organization
- **Shared styles** in `assets/styles.css`
- **Shared JavaScript** in `assets/scripts.js`
- **Images/media** in `assets/` folder
- **Each page** includes external assets

## ✅ SEO Optimization

### Current Optimizations
- **Meta descriptions** on all pages
- **Title tags** with keywords
- **Semantic HTML** structure
- **Mobile responsive** design
- **Fast loading** (no heavy frameworks)

### Additional SEO Recommendations
1. Add **structured data** markup
2. Create **XML sitemap**
3. Set up **Google Search Console**
4. Add **Open Graph** tags for social sharing
5. Optimize **image alt tags** when images are added

## 📱 Mobile Optimization

- **Responsive grid system**
- **Touch-friendly buttons** (min 44px)
- **Readable font sizes** (16px+)
- **Optimized forms** for mobile
- **Fast loading** on slow connections

## 🧪 A/B Testing Ready

The structure supports easy A/B testing:
- **Headline variations**
- **CTA button text/colors**
- **Feature ordering**
- **Social proof placement**

## 📋 Next Steps

1. **Create PDF** from the meal plan content outline
2. **Set up email integration** with chosen provider
3. **Deploy to hosting** platform
4. **Configure analytics** tracking
5. **Test conversion flow** end-to-end
6. **Launch Facebook/Instagram ads** targeting GLP-1 users

## 📞 Support

For questions about the codebase or implementation:
- **Email**: developer@postdoserx.com
- **Issues**: Use GitHub issues for bugs/features

---

Built with ❤️ for the GLP-1 community