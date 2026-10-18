# Launch checklist

The `/admin` overview shows a live version of this list.

## Confirmed and already on the site

- [x] Event: Eco-friendly Diwali Mandi 2026
- [x] Date and time: Tuesday 27 October 2026, 9 am to 3 pm
- [x] Venue: S. B. Patil Institute of Management, Pradhikaran Road, Haveli, Maharashtra 411044 (with Google Maps directions)
- [x] Stall name: TERRA UTSAV. Mascot: Koochu Puchu (original)
- [x] Instagram: https://www.instagram.com/pcet_terra_utsav ("Follow us on Instagram")
- [x] Attractions: Chocolate Bomb, Chat Papdi, homemade Diwali diyas, 60-second wet-brick challenge, Catch the Koochu Puchu

## Still needed (organisers or team)

**Event**
- [ ] Exact stall spot on the campus (admin > Event > Stall spot)

**Menu and diyas**
- [ ] Prices for Chocolate Bomb, Chat Papdi and the diyas (admin > Menu)
- [ ] Real photos of the food and of the homemade diyas
- [ ] Check the descriptions; add ingredient or allergen information only if it is verified
- [ ] Confirm the approved taglines are still right ("Crack it. Pour it. Devour it." implies something is poured)

**Rewards**
- [ ] What a coupon is worth (admin > Rewards)
- [ ] Coupon expiry (for example 27 Oct 2026, 3 pm IST) and how many coupons exist in total
- [ ] Tick "terms confirmed"

**Brick challenge**
- [ ] Organisers approve or edit the draft safety and eligibility rules in `src/content/challenge.ts`, then set
      `rulesApproved: true`
- [ ] Decide whether there is a prize, how many attempts each person gets, and who supervises

**Team**
- [ ] Real team groups (for example kitchen, marketing) with one-line descriptions
- [ ] About 20 students and 3 mentors: real name, actual title, group, photo (with consent), optional bio and links
- [ ] Outfit per group or person (the nine options are previewed on the team page)

**Game**
- [ ] Playtest with 10 or more people on phones; compare the admin "Actual" win rate with the model; adjust in admin > Game
- [ ] Decide what happens if someone wins when coupons run out

**Accounts and services**
- [ ] Supabase project, migrations applied, auth URLs and email template set, custom SMTP for event day
- [ ] First admin added by SQL; staff accounts added in admin
- [ ] GitHub repository under the intended account; Vercel project with environment variables; domain; `NEXT_PUBLIC_SITE_URL`
- [ ] A staff dry run: win a coupon on a test account, redeem it on a staff phone, try redeeming again (must fail)

**Files**
- [ ] Save the approved homepage screenshot as `design/reference/homepage-final.png`
