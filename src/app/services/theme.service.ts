import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  isDarkMode$ = new BehaviorSubject<boolean>(false);

  constructor() {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.setTheme(prefersDark);
  }

  toggleTheme(): void {
    this.setTheme(!this.isDarkMode$.value);
  }

  private setTheme(isDark: boolean): void {
    this.isDarkMode$.next(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}